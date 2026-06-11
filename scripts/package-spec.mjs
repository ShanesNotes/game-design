#!/usr/bin/env node
// Export a seed's finished spec as a clean, self-contained SPEC PACK — the
// factory's terminal artifact (ADR 0006). Assembles validated run artifacts
// (SPEC.md, thesis, engine decision, issues/) with the co-dev templates and the
// shipped guards into a staging dir, proves the result leaks no factory state,
// then writes it to the target folder. Dry-run by default; --write materializes.
//
// Usage: node scripts/package-spec.mjs --seed-id <id> [--to <dir>] [--write] [--force]
//   --to defaults to the run's declared default_spec_pack_root.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  runDirFor, runRelFor, readManifest, isValidSeedId, resolveRunPath,
  specPackRootFor, validateManifest, manifestPathPolicyErrors,
  writeRunFileSync, appendRunFileSync, validateLedgerRow, firstSymlinkComponent
} from "./lib/run-state.mjs";
import { leakageErrors } from "./lib/leakage.mjs";

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg) { console.error(`[package-spec] ERROR: ${msg}`); process.exit(1); }

const argv = process.argv.slice(2);
function arg(name, defaultValue = null) { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : defaultValue; }
const seedId = arg("seed-id");
const write = argv.includes("--write");
const force = argv.includes("--force");

if (!seedId) fail("usage: --seed-id <id> [--to <dir>] [--write] [--force]");
if (!isValidSeedId(seedId)) fail(`invalid --seed-id: ${seedId}`);
const target = path.resolve(arg("to", specPackRootFor(seedId)));

const runDir = runDirFor(process.cwd(), seedId);
const runRel = runRelFor(seedId);
let manifest;
try { manifest = readManifest(runDir, seedId, process.cwd()); }
catch (e) { fail(`manifest rejected: ${e.message}`); }
if (!manifest) fail(`no run at ${runRel}`);

// The whole run must be valid (phase legality, design-lock evidence, embedded
// artifact schemas, spec consistency) before anything is exported. Completion is
// verifier evidence, not prose — reuse the run check rather than re-deriving it.
const runCheck = spawnSync(process.execPath,
  [path.join(FACTORY_ROOT, "scripts", "validate-artifacts.mjs"), "--check", "run", "--seed-id", seedId],
  { cwd: process.cwd(), encoding: "utf8" });
if (runCheck.status !== 0) fail(`run validation failed:\n${runCheck.stdout || runCheck.stderr}`);

if (!["decompose", "handoff"].includes(manifest.current_phase)) {
  fail(`spec pack export requires current_phase decompose or handoff, got '${manifest.current_phase}'`);
}
if (!manifest.spec_path) fail("refusing to package before SPEC.md exists (decompose phase)");

const issuesDir = path.join(runDir, "issues");
const issueFiles = fs.existsSync(issuesDir)
  ? fs.readdirSync(issuesDir).filter((f) => f.endsWith(".md")).sort()
  : [];
if (!issueFiles.length) fail(`no issues rendered under ${runRel}/issues — run emit-local-issues.mjs --write first`);

const seedText = fs.existsSync(path.join(runDir, "GAME_SEED.md"))
  ? fs.readFileSync(path.join(runDir, "GAME_SEED.md"), "utf8")
      .split("\n").map((l) => l.trim()).filter((l) => l && l !== "# GAME_SEED.md").join(" / ")
  : seedId;

let thesisPath; let enginePath; let specPath;
try {
  thesisPath = resolveRunPath(process.cwd(), seedId, manifest.game_thesis_path, "game_thesis_path");
  enginePath = resolveRunPath(process.cwd(), seedId, manifest.engine_decision_path, "engine_decision_path");
  specPath = resolveRunPath(process.cwd(), seedId, manifest.spec_path, "spec_path");
} catch (e) {
  fail(e.message);
}

// --- Assemble in staging, prove cleanliness, only then touch the target ---
const tplDir = path.join(FACTORY_ROOT, "templates", "spec-pack");
const sub = (s) => s.replaceAll("{{SEED_ID}}", seedId).replaceAll("{{SEED}}", seedText);
const staging = fs.mkdtempSync(path.join(os.tmpdir(), "tgf-spec-pack-"));
function put(relPath, contents) {
  const p = path.join(staging, relPath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contents);
}
function copyTree(fromDir, toRel) {
  for (const e of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, e.name);
    if (e.isDirectory()) copyTree(from, path.join(toRel, e.name));
    else put(path.join(toRel, e.name), fs.readFileSync(from, "utf8"));
  }
}

try {
  for (const f of ["README.md", "AGENTS.md", "PLAYTEST_PLAN.md"]) {
    put(f, sub(fs.readFileSync(path.join(tplDir, f), "utf8")));
  }
  copyTree(path.join(tplDir, "guards"), "guards");
  put("GAME_SEED.md", fs.readFileSync(path.join(runDir, "GAME_SEED.md"), "utf8"));
  put("GAME_THESIS.md", fs.readFileSync(thesisPath, "utf8"));
  put("SPEC.md", fs.readFileSync(specPath, "utf8"));
  put(path.join("decisions", path.basename(enginePath)), fs.readFileSync(enginePath, "utf8"));
  for (const f of issueFiles) {
    if (firstSymlinkComponent(path.join(issuesDir, f))) fail(`issue file must not be a symlink: ${f}`);
    put(path.join("issues", f), fs.readFileSync(path.join(issuesDir, f), "utf8"));
  }
  for (const s of ["playtest-report", "depth-vector", "asset-provenance"]) {
    // Shipped schemas drop the orchestrator name from their title — the pack must
    // not reference the factory (the leakage gate below enforces this).
    const schema = JSON.parse(fs.readFileSync(path.join(FACTORY_ROOT, "schemas", `${s}.schema.json`), "utf8"));
    schema.title = String(schema.title || "").replace(/^Tiny Game Factory\s*/, "Game ");
    put(path.join("schemas", `${s}.schema.json`), JSON.stringify(schema, null, 2) + "\n");
  }
  for (const d of ["playtests", "reviews"]) put(path.join(d, ".gitkeep"), "");

  // Separation is absolute (ADR 0003): the assembled pack must carry zero factory
  // state — no .tgf paths, orchestrator names, or absolute source paths — even if
  // an authored artifact (thesis/spec/issue) smuggled one in.
  const leaks = leakageErrors([staging], staging);
  if (leaks.length) fail(`spec pack failed leakage gate; redact these in the run artifacts and re-export:\n  ${leaks.join("\n  ")}`);

  const packFiles = [];
  (function list(d, prefix = "") {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.isDirectory()) list(path.join(d, e.name), path.join(prefix, e.name));
      else packFiles.push(path.join(prefix, e.name));
    }
  })(staging);

  if (!write) {
    console.log(`# Dry-run spec pack for ${seedId}`);
    console.log(`# Target: ${target}`);
    console.log(`# Re-run with --write to export.`);
    for (const f of packFiles) console.log(`- ${f}`);
    process.exit(0);
  }

  if (fs.existsSync(target) && fs.readdirSync(target).length && !force) {
    fail(`${target} exists and is not empty; pass --force to overwrite its pack files`);
  }
  fs.mkdirSync(target, { recursive: true });
  for (const f of packFiles) {
    const to = path.join(target, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(staging, f), to);
  }

  // Record the export in the run: ledger row always; spec_pack_path only when the
  // target is the declared default root (the path policy forbids anything else).
  const iso = new Date().toISOString();
  const insideDefaultRoot = target === specPackRootFor(seedId)
    || (target.startsWith(specPackRootFor(seedId) + path.sep));
  const row = {
    ts: iso, seed_id: seedId, phase: manifest.current_phase,
    event: "spec-pack-exported", status: "passed", actor: "package-spec.mjs",
    changed_paths: [`${runRel}/manifest.json`, `${runRel}/execution-ledger.jsonl`],
    verification: {
      commands: [`node scripts/package-spec.mjs --seed-id ${seedId} --write`],
      status: "passed",
      evidence: `spec pack exported (${packFiles.length} files) after run validation and leakage gate; target recorded in this row's notes`
    },
    blockers: []
  };
  const rowErrors = validateLedgerRow(row);
  if (rowErrors.length) fail(`ledger row invalid:\n  ${rowErrors.join("\n  ")}`);
  const next = JSON.parse(JSON.stringify(manifest));
  if (insideDefaultRoot) next.spec_pack_path = target;
  next.last_verified_at = iso;
  const manErrors = [
    ...validateManifest(next).map((e) => `manifest ${e}`),
    ...manifestPathPolicyErrors(next, seedId)
  ];
  if (manErrors.length) fail(`resulting manifest invalid:\n  ${manErrors.join("\n  ")}`);
  writeRunFileSync(process.cwd(), seedId, `${runRel}/manifest.json`, JSON.stringify(next, null, 2) + "\n");
  appendRunFileSync(process.cwd(), seedId, `${runRel}/execution-ledger.jsonl`, JSON.stringify(row) + "\n");

  console.log(`[package-spec] exported ${packFiles.length} files to ${target}`);
  console.log(`[package-spec] next: open ${target} in a fresh session and follow its AGENTS.md`);
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}
