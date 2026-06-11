#!/usr/bin/env node
// End-to-end idea-factory entrypoint. Given a seed id plus optional one-line seed,
// initialize/resume the run, write a durable IDEA_WALKTHROUGH.md, and when thesis +
// engine ADR + SPEC.md are present, decompose the idea through emit-local-issues.mjs.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  runDirFor, runRelFor, readManifest, readLedger, readEmbeddedArtifact,
  validateLedgerRow, isValidSeedId, resolveRunPath, writeRunFileSync, appendRunFileSync
} from "./lib/run-state.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function fail(msg) { console.error(`[walk-game-idea] ERROR: ${msg}`); process.exit(1); }
const argv = process.argv.slice(2);
function arg(name, defaultValue = null) { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : defaultValue; }
const has = (name) => argv.includes(`--${name}`);

const seedId = arg("seed-id");
const seed = arg("seed");
const writeIssues = has("write-issues");
const forceIssues = has("force-issues");
const noWrite = has("no-write");

if (!seedId) fail("usage: --seed-id <id> [--seed '<one-line seed>'] [--write-issues] [--force-issues] [--no-write]");
if (!isValidSeedId(seedId)) fail(`invalid --seed-id: ${seedId}`);
if (noWrite && writeIssues) fail("--no-write cannot be combined with --write-issues");

const runDir = runDirFor(process.cwd(), seedId);
const runRel = runRelFor(seedId);
if (!fs.existsSync(path.join(runDir, "manifest.json"))) {
  if (!seed) fail(`no run at ${runRel}; pass --seed to initialize it`);
  if (noWrite) fail("--no-write cannot initialize a missing run");
  const r = spawnSync(process.execPath, [path.join(SCRIPT_DIR, "init-game-run.mjs"), "--seed-id", seedId, "--seed", seed], {
    cwd: process.cwd(), encoding: "utf8"
  });
  if (r.status !== 0) fail(`init failed:\n${r.stderr || r.stdout}`);
}

let manifest;
try { manifest = readManifest(runDir, seedId, process.cwd()); }
catch (e) { fail(`manifest rejected: ${e.message}`); }
if (!manifest) fail(`no run at ${runRel}`);

let ledger;
try { ledger = readLedger(runDir, seedId, process.cwd()); }
catch (e) { fail(`ledger rejected: ${e.message}`); }
const { rows, parseErrors } = ledger;
if (parseErrors.length) fail(`ledger invalid:\n  ${parseErrors.join("\n  ")}`);
rows.forEach((row, i) => {
  const errors = validateLedgerRow(row);
  if (errors.length) fail(`ledger row ${i + 1} invalid:\n  ${errors.join("\n  ")}`);
});
const seedPathRel = manifest.seed_path || `${runRel}/GAME_SEED.md`;
let seedPath;
try { seedPath = resolveRunPath(process.cwd(), seedId, seedPathRel, "seed_path"); }
catch (e) { fail(e.message); }
const rawSeedText = fs.existsSync(seedPath)
  ? fs.readFileSync(seedPath, "utf8").trim()
  : seed || manifest.seed_id;
const seedText = rawSeedText
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && line !== "# GAME_SEED.md")
  .join(" / ");

function readArtifact(manifestKey, schemaName) {
  const relPath = manifest[manifestKey];
  if (!relPath) return { relPath, obj: null, errors: [] };
  let file;
  try { file = resolveRunPath(process.cwd(), seedId, relPath, manifestKey); }
  catch (e) { return { relPath, obj: null, errors: [e.message] }; }
  const { obj, errors } = readEmbeddedArtifact(file, schemaName);
  return { relPath, obj, errors };
}

const thesis = readArtifact("game_thesis_path", "game-thesis");
const engine = readArtifact("engine_decision_path", "engine-profile-decision");
const spec = readArtifact("spec_path", "spec-decomposition");
function issueBlocker() {
  if (!thesis.obj) return "Backlog decomposition is blocked until GAME_THESIS.md validates.";
  if (!engine.obj) return "Backlog decomposition is blocked until an engine decision validates.";
  if (engine.obj.status !== "accepted") {
    return `Backlog decomposition is blocked until the engine decision is accepted; current status is ${engine.obj.status}.`;
  }
  if (engine.obj.seed_id !== seedId) {
    return `Backlog decomposition is blocked because engine decision seed_id '${engine.obj.seed_id}' does not match '${seedId}'.`;
  }
  if (!spec.obj) return "Backlog decomposition is blocked until SPEC.md validates (run the decompose phase).";
  if (spec.obj.seed_id !== seedId) {
    return `Backlog decomposition is blocked because spec seed_id '${spec.obj.seed_id}' does not match '${seedId}'.`;
  }
  return null;
}
const issueBlockerText = issueBlocker();
const readyForIssues = !issueBlockerText;

function bullets(items) {
  if (!items || !items.length) return "- (none recorded)";
  return items.map((item) => `- ${item}`).join("\n");
}
function objSummary(obj) {
  if (!obj || typeof obj !== "object") return String(obj);
  if (obj.id) return `${obj.id}: ${obj.thesis || obj.verbs || obj.profile || JSON.stringify(obj)}`;
  if (obj.rank) return `rank ${obj.rank}: ${obj.profile || JSON.stringify(obj)}`;
  return JSON.stringify(obj);
}
function nextAction(phase) {
  const table = {
    intake: "Run tgf-office-hours-grill, then initialize toolchain once the seed direction is stable.",
    toolchain: "Run tgf-verify-toolchain, then compile GAME_THESIS.md from the seed.",
    thesis: "Run tgf-seed-compile until GAME_THESIS.md is schema-valid and anchored in the anti-boring gate.",
    "design-review": "Run the design red-team (tgf-depth-redteam) against the thesis: depth vector + verdict ADVANCE/DEEPEN/KILL.",
    deepen: "Apply exactly one named transform to the thesis, increment deepen attempts, then re-run the design review.",
    "engine-profile": "Score engine/profile candidates against the design-locked thesis and write decisions/0001-engine-profile.md.",
    decompose: "Author SPEC.md (tgf-decompose): ordered tracer-bullet slices with falsifiable acceptance, then emit local issues.",
    handoff: "Package the spec pack (package-spec.mjs) into the clean co-dev folder and record the export.",
    blocked: "Read the ledger blocker, resolve it with evidence, then resume the appropriate non-terminal phase.",
    failed: "Distill failure evidence into a new seed or explicit restart decision.",
    killed: "Do not resume without a new evidence-backed seed brief.",
    complete: "No active game-idea work remains for this seed; the spec pack is the deliverable."
  };
  return table[phase] || "Inspect manifest.current_phase and route through tgf-harness.";
}

let plannedIssuePaths = [];
let emittedIssuePaths = [];
function parseDryRunIssuePaths(stdout) {
  return stdout.split("\n").map((line) => line.match(/^--- (.+\.md) ---$/)?.[1]).filter(Boolean);
}
function parseWrittenIssuePaths(stdout) {
  return stdout.split("\n").map((line) => line.match(/^\[emit-local-issues\] wrote (.+)$/)?.[1]).filter(Boolean);
}
function runIssueEmitter({ write = false } = {}) {
  const args = [path.join(SCRIPT_DIR, "emit-local-issues.mjs"), "--seed-id", seedId];
  if (write) args.push("--write");
  if (write && forceIssues) args.push("--force");
  const r = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: "utf8" });
  if (r.status !== 0) fail(`backlog decomposition failed:\n${r.stderr || r.stdout}`);
  return r.stdout.trim();
}
function issuePreview() {
  if (!readyForIssues) return issueBlockerText;
  const stdout = runIssueEmitter();
  plannedIssuePaths = parseDryRunIssuePaths(stdout);
  if (!writeIssues) return stdout;
  return stdout
    .replace(`# Dry-run local issues for ${seedId}`, `# Local issues planned for ${seedId}`)
    .replace(
      /# Re-run with --write to create files under .+\./,
      "# --write-issues will create these files after run-owned writes preflight."
    );
}

const lines = [];
lines.push(`# Idea walkthrough: ${seedId}`);
lines.push("");
lines.push(`- current phase: ${manifest.current_phase}`);
lines.push(`- run state: ${runRel}`);
lines.push(`- seed: ${seedText}`);
lines.push(`- thesis: ${manifest.game_thesis_path || "(not compiled)"}`);
lines.push(`- engine ADR: ${manifest.engine_decision_path || "(not decided)"}`);
lines.push(`- ledger rows: ${rows.length}${parseErrors.length ? ` (${parseErrors.length} parse warning(s))` : ""}`);
lines.push("");
lines.push("## Architectural decision ladder");
lines.push("");
lines.push("1. **Premise / fantasy** — compile the seed into a falsifiable GAME_THESIS.md before any decomposition.");
lines.push("2. **Core loop candidates** — name the repeated verbs and why the naked mechanics might stay replayable.");
lines.push("3. **Design depth gate** — red-team the thesis on paper: depth vector >=16/24, required axes nonzero (design-lock).");
lines.push("4. **Engine/profile decision** — recommend the cheapest reversible surface only after the design-locked thesis.");
lines.push("5. **Spec decomposition** — slice the design into ordered tracer-bullet issues with falsifiable acceptance.");
lines.push("6. **Spec pack handoff** — export a clean co-dev folder; the anti-boring falsifiers travel with it as obligations.");
lines.push("7. **Proof happens downstream** — the co-dev repo builds the slices and produces the bot playtest evidence.");
lines.push("");
lines.push("## Current next action");
lines.push("");
lines.push(nextAction(manifest.current_phase));
lines.push("");
if (thesis.errors.length) {
  lines.push("## Thesis validation errors");
  lines.push("");
  lines.push(bullets(thesis.errors));
  lines.push("");
} else if (thesis.obj) {
  lines.push("## Thesis anchors");
  lines.push("");
  lines.push(`- pitch: ${thesis.obj.pitch}`);
  lines.push(`- replayability hypothesis: ${thesis.obj.replayability_hypothesis}`);
  lines.push("- core loop candidates:");
  lines.push(bullets((thesis.obj.core_loop_candidates || []).map(objSummary)));
  lines.push("- engine profile candidates:");
  lines.push(bullets((thesis.obj.engine_profile_candidates || []).map(objSummary)));
  lines.push(`- first slice: ${objSummary(thesis.obj.first_playable_slice || {})}`);
  lines.push("- kill conditions:");
  lines.push(bullets(thesis.obj.kill_conditions || []));
  lines.push("");
}
if (engine.errors.length) {
  lines.push("## Engine decision validation errors");
  lines.push("");
  lines.push(bullets(engine.errors));
  lines.push("");
} else if (engine.obj) {
  lines.push("## Engine/profile decision");
  lines.push("");
  lines.push(`- decision: ${engine.obj.decision}`);
  lines.push(`- profile: ${engine.obj.profile}`);
  lines.push(`- rationale: ${engine.obj.rationale}`);
  lines.push("- reversal triggers:");
  lines.push(bullets(engine.obj.reversal_triggers || []));
  lines.push("");
}
if (spec.errors.length) {
  lines.push("## Spec validation errors");
  lines.push("");
  lines.push(bullets(spec.errors));
  lines.push("");
} else if (spec.obj) {
  lines.push("## Spec decomposition");
  lines.push("");
  lines.push(`- summary: ${spec.obj.summary}`);
  lines.push(`- chosen loop: ${spec.obj.chosen_loop_id}`);
  lines.push(`- slices: ${(spec.obj.slices || []).length}`);
  lines.push("");
}
lines.push("## Decomposition preview");
lines.push("");
lines.push(issuePreview());
lines.push("");
lines.push("## Doctrine guardrails");
lines.push("");
lines.push("- No decomposition before GAME_THESIS.md; no slicing before design-lock.");
lines.push("- No default engine before thesis + engine ADR.");
lines.push("- No remote issue publishing by default.");
lines.push("- No game code in this factory; building happens in the exported spec pack's folder.");
lines.push("- Completion is validator/verdict evidence, not prose.");
lines.push("");
const walkthrough = `${lines.join("\n").trim()}\n`;
const walkthroughRel = `${runRel}/IDEA_WALKTHROUGH.md`;
const ledgerRel = `${runRel}/execution-ledger.jsonl`;

if (!noWrite) {
  if (writeIssues && plannedIssuePaths.length === 0) {
    fail("backlog decomposition dry-run produced no issue paths to write");
  }
  const buildRow = (issuePaths) => ({
    ts: new Date().toISOString(),
    seed_id: seedId,
    phase: manifest.current_phase,
    event: "idea-walkthrough-written",
    status: "checkpointed",
    actor: "walk-game-idea.mjs",
    changed_paths: [walkthroughRel, ...issuePaths],
    verification: {
      commands: [`node scripts/walk-game-idea.mjs --seed-id ${seedId}${seed ? " --seed <seed>" : ""}${writeIssues ? " --write-issues" : ""}${forceIssues ? " --force-issues" : ""}`],
      status: "passed",
      evidence: writeIssues && issuePaths.length
        ? "IDEA_WALKTHROUGH.md written; local issue files emitted from valid thesis+engine ADR+SPEC."
        : "IDEA_WALKTHROUGH.md written; decomposition preview emitted when thesis+engine ADR+SPEC were available."
    }
  });
  const preflightRowErrors = validateLedgerRow(buildRow(writeIssues ? plannedIssuePaths : []));
  if (preflightRowErrors.length) fail(`ledger row invalid:\n  ${preflightRowErrors.join("\n  ")}`);
  try {
    resolveRunPath(process.cwd(), seedId, walkthroughRel, walkthroughRel);
    resolveRunPath(process.cwd(), seedId, ledgerRel, ledgerRel);
  } catch (e) { fail(e.message); }
  if (writeIssues) {
    emittedIssuePaths = parseWrittenIssuePaths(runIssueEmitter({ write: true }));
  }
  const issuePaths = writeIssues ? (emittedIssuePaths.length ? emittedIssuePaths : plannedIssuePaths) : [];
  const row = buildRow(issuePaths);
  const rowErrors = validateLedgerRow(row);
  if (rowErrors.length) fail(`ledger row invalid:\n  ${rowErrors.join("\n  ")}`);
  try { writeRunFileSync(process.cwd(), seedId, walkthroughRel, walkthrough); }
  catch (e) { fail(e.message); }
  try { appendRunFileSync(process.cwd(), seedId, ledgerRel, `${JSON.stringify(row)}\n`); }
  catch (e) { fail(e.message); }
}

console.log(walkthrough);
if (!noWrite) console.error(`[walk-game-idea] wrote ${walkthroughRel}`);
