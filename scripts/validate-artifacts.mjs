#!/usr/bin/env node
// Factory artifact validator. Proves the repo matches its own contracts without needing a
// runtime game. Checks: required-tree | schemas | generated-leakage | no-default-engine | skill-refs | run | all.
// `all` runs every check except `run`, which is on-demand (requires --seed-id).
// Usage: node scripts/validate-artifacts.mjs --check <mode> [--seed-id <id>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./lib/validate-json-schema.mjs";
import * as runState from "./lib/run-state.mjs";
import * as gate from "./lib/anti-boring-gate.mjs";
import { SKILLS, SCHEMAS, HOOKS, FIXTURE_SCHEMA, PROMPT_MAX } from "./lib/factory-contract.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(REPO, ...p);
const exists = (...p) => fs.existsSync(rel(...p));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

// SKILLS, SCHEMAS, HOOKS, FIXTURE_SCHEMA, PROMPT_MAX come from the factory-contract
// registry (scripts/lib/factory-contract.mjs) — the single source of truth.

// --- required tree ---
function checkRequiredTree() {
  const errors = [];
  const required = [
    "AGENTS.md", "README.md", "CONTEXT.md", "DESIGN.md", "factory.config.toml", "package.json",
    "docs/doctrine.md", "docs/engine-matrix.md", "docs/anti-boring-gate.md", "docs/hooks-and-guards.md",
    "docs/toolchain-verification-ledger.md", "docs/borrowed-patterns.md", "docs/repo-radar.md", "docs/source-ledger.md",
    "docs/adr/0001-meta-factory-root.md", "docs/adr/0002-evidence-first-prototype-search.md",
    "docs/adr/0003-factory-game-separation.md", "docs/adr/0004-factory-layout-and-skill-packaging.md",
    "docs/adr/0005-gate-policy-in-checkers-not-schemas.md",
    "docs/agents/domain.md", "docs/agents/issue-tracker.md", "docs/agents/triage-labels.md",
    "scripts/verify-local-tools.mjs", "scripts/init-game-run.mjs", "scripts/run-gates.mjs",
    "scripts/validate-artifacts.mjs", "scripts/summarize-run.mjs", "scripts/advance-run.mjs",
    "templates/run/manifest.json", "templates/run/GAME_SEED.md", "templates/run/GAME_THESIS.template.md",
    "templates/run/README_AGENT_BOOT.md", "templates/run/README_NEXT_ACTIONS.md",
    "templates/run/decisions/0001-engine-profile.md",
    "templates/game-repo/AGENTS.md", "templates/game-repo/README.md", "templates/game-repo/PLAYTEST_PLAN.md"
  ];
  required.push(...SCHEMAS.map((s) => `schemas/${s}.schema.json`));
  required.push(...HOOKS.map((h) => `hooks/${h}.mjs`));
  required.push(...SKILLS.map((s) => `.codex/skills/${s}/SKILL.md`));
  required.push(...Object.keys(FIXTURE_SCHEMA).map((f) => `examples/fixtures/${f}`));
  for (const p of required) if (!exists(p)) errors.push(`missing: ${p}`);

  // prompts P00..P17
  const promptDir = rel(".factory/prompts");
  const promptFiles = fs.existsSync(promptDir) ? fs.readdirSync(promptDir) : [];
  for (let n = 0; n <= PROMPT_MAX; n++) {
    const pre = `P${String(n).padStart(2, "0")}_`;
    if (!promptFiles.some((f) => f.startsWith(pre) && f.endsWith(".md"))) errors.push(`missing prompt: .factory/prompts/${pre}*.md`);
  }
  // P07 must be the RED_TEAM-normalized name
  if (promptFiles.includes("P07_DEPTH_REDTEAM.md") && !promptFiles.includes("P07_DEPTH_RED_TEAM.md")) {
    errors.push("prompt P07 not normalized: expected P07_DEPTH_RED_TEAM.md");
  }
  return errors;
}

// --- schemas parse + fixtures validate ---
function checkSchemas() {
  const errors = [];
  for (const s of SCHEMAS) {
    const p = rel("schemas", `${s}.schema.json`);
    if (!fs.existsSync(p)) { errors.push(`missing schema: schemas/${s}.schema.json`); continue; }
    let schema;
    try { schema = JSON.parse(fs.readFileSync(p, "utf8")); }
    catch (e) { errors.push(`schemas/${s}.schema.json does not parse: ${e.message}`); continue; }
    for (const key of ["$schema", "title", "type"]) {
      if (!schema[key]) errors.push(`schemas/${s}.schema.json missing '${key}'`);
    }
    if (schema.type === "object" && !schema.required) {
      errors.push(`schemas/${s}.schema.json (object) has no 'required' array`);
    }
  }
  for (const [fixture, schemaFile] of Object.entries(FIXTURE_SCHEMA)) {
    const fp = rel("examples/fixtures", fixture);
    const sp = rel("schemas", schemaFile);
    if (!fs.existsSync(fp) || !fs.existsSync(sp)) { errors.push(`fixture or schema missing for ${fixture}`); continue; }
    const errs = validate(JSON.parse(fs.readFileSync(sp, "utf8")), JSON.parse(fs.readFileSync(fp, "utf8")));
    errs.forEach((e) => errors.push(`fixture ${fixture}: ${e}`));
  }
  return errors;
}

// --- generated leakage (child game templates must stay free of orchestration/source markers) ---
const LEAK_TOKENS = [
  [/\.tgf\b/, ".tgf run state"],
  [/\.omx\b/i, ".omx state"],
  [/\.sandcastle\b/i, ".sandcastle state"],
  [/gstack/i, "GStack"],
  [/pocock/i, "Pocock"],
  [/sandcastle/i, "Sandcastle"],
  [/\bOMX\b/, "OMX"],
  [/tiny[ -]app[ -]factory/i, "Tiny App Factory product term"],
  [/tiny[ -]game[ -]factory/i, "Tiny Game Factory orchestrator name"],
  [/tincture/i, "Tincture of Mercy product term"],
  [/rescue[ -]town[ -]builders/i, "Rescue Town Builders product term"],
  [/\/home\/ark\//, "absolute /home/ark path"]
];
function scanDir(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) scanDir(p, acc);
    else acc.push(p);
  }
  return acc;
}
function checkGeneratedLeakage() {
  const errors = [];
  const scanRoots = [rel("templates/game-repo"), rel("examples/seeds")];
  for (const root of scanRoots) {
    for (const file of scanDir(root)) {
      const text = fs.readFileSync(file, "utf8");
      for (const [re, label] of LEAK_TOKENS) {
        if (re.test(text)) errors.push(`leakage in ${path.relative(REPO, file)}: ${label}`);
      }
    }
  }
  return errors;
}

// --- no default engine before thesis ---
function checkNoDefaultEngine() {
  const errors = [];
  const engineConfigs = ["vite.config.ts", "vite.config.js", "vite.config.mjs", "project.godot", "Cargo.toml", "next.config.js", "svelte.config.js"];
  for (const c of engineConfigs) if (exists(c)) errors.push(`engine config present at factory root: ${c}`);
  for (const d of ["src", "app", "public", "assets"]) {
    if (exists(d) && fs.statSync(rel(d)).isDirectory()) errors.push(`game scaffolding dir present at factory root: ${d}/`);
  }
  if (exists("package.json")) {
    const pkg = JSON.parse(fs.readFileSync(rel("package.json"), "utf8"));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const engineDep = /phaser|three|godot|bevy|kaplay|excalibur|@react-three|babylonjs/i;
    for (const name of Object.keys(deps)) if (engineDep.test(name)) errors.push(`engine dependency present: ${name}`);
  }
  return errors;
}

// --- run check (validates a .tgf/seeds/{id} run at ANY phase, relative to cwd) ---
// Run-state shape, schema validation, path policy, phase transitions, and
// phase-gated artifact rules all come from scripts/lib/run-state.mjs. The check
// has two layers: invariants that hold for the whole life of a run, and init-only
// invariants that hold only while a run has not yet progressed past initialization
// (a fresh run must not already contain downstream products like a thesis or a
// child game repo; once those legitimately exist, their presence is expected, not
// an error). Before this split, the check clamped current_phase to toolchain|intake,
// so it could only ever validate a freshly-initialized run — leaving the phase
// machine and phase-artifact constraints unreachable for real, in-progress runs.
function checkRun(seedId) {
  const errors = [];
  if (!seedId) return ["--check run requires --seed-id <id>"];
  const runDir = runState.runDirFor(process.cwd(), seedId);
  let manifest;
  try { manifest = runState.readManifest(runDir); }
  catch { return [`run manifest is not parseable JSON: .tgf/seeds/${seedId}/manifest.json`]; }
  if (!manifest) return [`run manifest missing: .tgf/seeds/${seedId}/manifest.json`];

  // Whole-life invariants (every phase).
  runState.validateManifest(manifest).forEach((e) => errors.push(`manifest ${e}`));
  runState.manifestPathPolicyErrors(manifest, seedId).forEach((e) => errors.push(e));
  runState.phaseArtifactConstraintErrors(manifest).forEach((e) => errors.push(e));
  runState.questionBudgetErrors(manifest).forEach((e) => errors.push(e));
  runState.deepenAttemptErrors(manifest).forEach((e) => errors.push(e));
  if (manifest.external_side_effects_allowed !== false) errors.push("external_side_effects_allowed must be false");
  // Game code never lives in the run-state dir; it belongs in the child game repo.
  for (const bad of ["src", "app", "public", "assets"]) {
    if (fs.existsSync(path.join(runDir, bad))) errors.push(`run dir contains forbidden ${bad}/`);
  }
  // A declared artifact path must point at a real file whose embedded ```json block
  // validates against its schema (the artifact is markdown carrying a canonical block).
  if (manifest.game_thesis_path) {
    const tp = path.resolve(process.cwd(), manifest.game_thesis_path);
    if (!fs.existsSync(tp)) errors.push(`game_thesis_path set but file missing: ${manifest.game_thesis_path}`);
    else runState.validateEmbeddedJson(tp, "game-thesis").forEach((e) => errors.push(`thesis ${e}`));
  }
  if (manifest.engine_decision_path) {
    const ep = path.resolve(process.cwd(), manifest.engine_decision_path);
    if (!fs.existsSync(ep)) errors.push(`engine_decision_path set but file missing: ${manifest.engine_decision_path}`);
    else runState.validateEmbeddedJson(ep, "engine-profile-decision").forEach((e) => errors.push(`engine ${e}`));
  }

  const { rows, parseErrors } = runState.readLedger(runDir);
  parseErrors.forEach((e) => errors.push(`ledger ${e}`));
  if (!rows.length) errors.push("execution-ledger.jsonl missing or empty");
  else {
    runState.validateLedgerRow(rows[0]).forEach((e) => errors.push(`ledger ${e}`));
    runState.ledgerTransitionErrors(rows).forEach((e) => errors.push(e));
    // Manifest beats memory: current_phase must equal the latest ledger phase.
    const lastPhase = [...rows].reverse().map((r) => r.phase).find((p) => typeof p === "string");
    if (lastPhase && lastPhase !== manifest.current_phase) {
      errors.push(`manifest current_phase '${manifest.current_phase}' != latest ledger phase '${lastPhase}'`);
    }
  }

  // Init-only invariants: a run that has not produced a thesis yet must not already
  // contain downstream products. The child game root may exist only once both a
  // thesis and an engine decision exist (README_AGENT_BOOT boot sequence).
  const beforeThesis = ["toolchain", "intake"].includes(manifest.current_phase) && !manifest.game_thesis_path;
  if (beforeThesis && fs.existsSync(path.join(runDir, "GAME_THESIS.md"))) {
    errors.push("GAME_THESIS.md exists before the thesis phase (no implementation before the thesis)");
  }
  const mayHaveChildRepo = manifest.game_thesis_path && manifest.engine_decision_path;
  if (!mayHaveChildRepo && fs.existsSync(runState.childGameRootFor(seedId))) {
    errors.push(`child game repo exists before thesis+engine decision: ${runState.childGameRootFor(seedId)}`);
  }

  // Fun-lock (and beyond) is evidence-gated: completion is evidence, not prose. A run
  // cannot be at/past fun-lock without a gate-passing depth vector in its reviews/ —
  // verdict ADVANCE that actually clears the gate (>=16/24, required axes nonzero).
  // Gate POLICY lives here (the checker), not in the schema (ADR 0005).
  const FUNLOCK_AND_PAST = ["fun-lock", "content", "art", "polish", "qa", "release-candidate", "handoff", "complete"];
  if (FUNLOCK_AND_PAST.includes(manifest.current_phase)) {
    const dvFiles = [];
    (function walk(d) {
      if (!fs.existsSync(d)) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name === "depth-vector.json") dvFiles.push(p);
      }
    })(path.join(runDir, "reviews"));
    let passing = false;
    for (const f of dvFiles) {
      let dv;
      try { dv = JSON.parse(fs.readFileSync(f, "utf8")); }
      catch { errors.push(`reviews depth vector not parseable JSON: ${path.relative(process.cwd(), f)}`); continue; }
      if (dv.verdict === "ADVANCE" && gate.depthVectorConsistencyErrors(dv).length === 0) passing = true;
    }
    if (!passing) {
      errors.push(`current_phase '${manifest.current_phase}' is at/past fun-lock but reviews/ has no gate-passing depth vector (verdict ADVANCE, total >=16, required axes nonzero)`);
    }
  }
  return errors;
}

// --- skill wrappers reference an existing prompt or declare themselves a router ---
function checkSkillRefs() {
  const errors = [];
  const promptDir = rel(".factory/prompts");
  const prompts = new Set(fs.existsSync(promptDir) ? fs.readdirSync(promptDir) : []);
  for (const s of SKILLS) {
    const p = rel(".codex/skills", s, "SKILL.md");
    if (!fs.existsSync(p)) { errors.push(`missing skill: .codex/skills/${s}/SKILL.md`); continue; }
    const text = fs.readFileSync(p, "utf8");
    const refs = [...text.matchAll(/P\d\d_[A-Z0-9_]+\.md/g)].map((m) => m[0]);
    refs.filter((r) => !prompts.has(r)).forEach((r) => errors.push(`${s}: references missing prompt ${r}`));
    if (!refs.some((r) => prompts.has(r)) && !/\brouter\b/i.test(text)) {
      errors.push(`${s}: SKILL.md must reference an existing .factory/prompts/P##_*.md or declare itself a router`);
    }
  }
  return errors;
}

// --- anti-boring gate consistency (artifact must not contradict its own numbers) ---
// `--check gate --file <path>` checks one depth-vector/playtest/branch-score artifact;
// with no --file it proves the example fixtures are internally gate-consistent.
function checkGate() {
  const file = arg("file");
  if (file) {
    let data;
    try { data = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch { return [`gate file not parseable JSON: ${file}`]; }
    return gate.gateConsistencyErrors(data).map((e) => `${file}: ${e}`);
  }
  const errors = [];
  for (const [fixture] of Object.entries(FIXTURE_SCHEMA)) {
    if (!/depth-vector|playtest-report|branch-score/.test(fixture)) continue;
    const data = JSON.parse(fs.readFileSync(rel("examples/fixtures", fixture), "utf8"));
    gate.gateConsistencyErrors(data).forEach((e) => errors.push(`fixture ${fixture}: ${e}`));
  }
  return errors;
}

// --- local issue files (.tgf/issues/*.md): structural check per issue-tracker.md ---
// No-op when .tgf/issues/ is absent (the convention is not active yet). Keeps the
// borrowed to-issues/to-prd/triage output honest the moment it lands locally.
const ISSUE_TYPES = ["bug", "feature", "chore", "slice"];
function checkIssues() {
  const errors = [];
  const dir = path.join(process.cwd(), ".tgf", "issues");
  if (!fs.existsSync(dir)) return errors;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".md")) continue;
    const fm = fs.readFileSync(path.join(dir, name), "utf8").match(/^---\n([\s\S]*?)\n---/);
    if (!fm) { errors.push(`${name}: missing YAML front matter`); continue; }
    const front = fm[1];
    const field = (k) => { const m = front.match(new RegExp(`^${k}:\\s*(.+)$`, "m")); return m ? m[1].trim() : null; };
    const stem = name.replace(/\.md$/, "");
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(stem)) errors.push(`${name}: filename must be a kebab-case slug`);
    if (field("id") !== stem) errors.push(`${name}: id '${field("id")}' must match filename '${stem}'`);
    for (const req of ["title", "type", "state", "afk"]) {
      if (!field(req)) errors.push(`${name}: missing required front-matter key '${req}'`);
    }
    const type = field("type");
    if (type && !ISSUE_TYPES.includes(type)) errors.push(`${name}: type '${type}' not in ${ISSUE_TYPES.join("|")}`);
  }
  return errors;
}

// --- thesis / engine decision: embedded ```json block validates against its schema ---
// On-demand, like `run`: resolves the artifact from a run's manifest (--seed-id) or a
// direct --file, so a phase can self-verify its output the moment it writes it.
function checkEmbeddedArtifact(kind) {
  const schemaName = kind === "thesis" ? "game-thesis" : "engine-profile-decision";
  const manifestKey = kind === "thesis" ? "game_thesis_path" : "engine_decision_path";
  const file = arg("file");
  let p;
  if (file) p = path.resolve(process.cwd(), file);
  else {
    const seedId = arg("seed-id");
    if (!seedId) return [`--check ${kind} requires --seed-id <id> or --file <path>`];
    const m = runState.readManifest(runState.runDirFor(process.cwd(), seedId));
    if (!m) return [`no run at .tgf/seeds/${seedId}`];
    if (!m[manifestKey]) return [`run ${seedId} has no ${manifestKey} set yet`];
    p = path.resolve(process.cwd(), m[manifestKey]);
  }
  return runState.validateEmbeddedJson(p, schemaName).map((e) => `${path.relative(process.cwd(), p)}: ${e}`);
}

const CHECKS = {
  "required-tree": checkRequiredTree,
  schemas: checkSchemas,
  "generated-leakage": checkGeneratedLeakage,
  "no-default-engine": checkNoDefaultEngine,
  "skill-refs": checkSkillRefs,
  gate: checkGate,
  issues: checkIssues,
  thesis: () => checkEmbeddedArtifact("thesis"),
  engine: () => checkEmbeddedArtifact("engine"),
  run: () => checkRun(arg("seed-id"))
};

const mode = arg("check") || "all";
const toRun = mode === "all"
  ? ["required-tree", "schemas", "generated-leakage", "no-default-engine", "skill-refs", "gate", "issues"]
  : [mode];

let totalErrors = 0;
for (const name of toRun) {
  const fn = CHECKS[name];
  if (!fn) { console.error(`unknown check: ${name}`); process.exit(2); }
  const errors = fn();
  totalErrors += errors.length;
  if (errors.length) {
    console.log(`✗ ${name} (${errors.length})`);
    errors.forEach((e) => console.log(`    - ${e}`));
  } else {
    console.log(`✓ ${name}`);
  }
}
console.log(totalErrors ? `\n${totalErrors} problem(s) found.` : "\nAll checks passed.");
process.exit(totalErrors ? 1 : 0);
