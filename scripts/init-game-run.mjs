#!/usr/bin/env node
// Non-destructive seed-run initializer. Creates ONLY .tgf/seeds/{seed-id}/ run state.
// It never creates a spec pack folder, never picks an engine, never writes a GAME_THESIS.md,
// and never writes gameplay code. Contract: docs/adr/0003 + the run-initializer contract.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SEED_ID_RE, RUN_DIRS, runRelFor, runDirFor, specPackRootFor,
  validateManifest, manifestPathPolicyErrors, symlinkWriteThroughPaths
} from "./lib/run-state.mjs";
import { renderTemplate } from "./lib/template.mjs";
import { arg, hasFlag } from "./lib/argv.mjs";

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const seedId = arg("seed-id");
const seed = arg("seed");
const mode = arg("mode", "grill");
const stop = arg("stop", "pack");
const origination = arg("origination", "user");
const dryRun = hasFlag("dry-run");
const force = hasFlag("force");

function fail(msg) {
  console.error(`[init-game-run] ERROR: ${msg}`);
  process.exit(1);
}

if (!seedId || !seed) {
  fail('usage: node scripts/init-game-run.mjs --seed-id <kebab-id> --seed "<one line>" [--mode grill|yolo] [--stop pack|design-lock] [--dry-run] [--force]');
}
if (!SEED_ID_RE.test(seedId)) {
  fail(`--seed-id must match ${SEED_ID_RE} (got "${seedId}")`);
}
if (!["grill", "yolo"].includes(mode)) {
  fail(`--mode must be grill or yolo (got "${mode}")`);
}
if (!["pack", "design-lock"].includes(stop)) {
  fail(`--stop must be pack or design-lock (got "${stop}")`);
}
if (!["user", "auto"].includes(origination)) {
  fail(`--origination must be user or auto (got "${origination}")`);
}
if (hasFlag("stop") && mode !== "yolo") {
  fail("--stop is only legal with --mode yolo");
}
if (origination === "auto" && mode !== "yolo") {
  fail("--origination auto requires --mode yolo");
}

const runRel = runRelFor(seedId);
const runDir = runDirFor(process.cwd(), seedId);
const specPackRoot = specPackRootFor(seedId);
const iso = new Date().toISOString();

// Load + substitute templates from the factory repo (independent of cwd).
const tplDir = path.join(FACTORY_ROOT, "templates", "run");
const readTpl = (name) =>
  renderTemplate(fs.readFileSync(path.join(tplDir, name), "utf8"), { SEED_ID: seedId, SEED: seed, ISO: iso });

const manifest = JSON.parse(readTpl("manifest.json"));
// Path-registry default: $STUDIO_ROOT/games/_export-{seed-id} (forge intake births games/{seed-id}).
manifest.default_spec_pack_root = specPackRoot;
manifest.design_lane = { mode, stop_line: stop, origination };
const bootDoc = readTpl("README_AGENT_BOOT.md");
const nextDoc = readTpl("README_NEXT_ACTIONS.md");
const seedDoc = `# GAME_SEED.md\n\n${seed}\n`;

const ledgerRow = {
  ts: iso,
  seed_id: seedId,
  phase: "intake",
  event: "run-initialized",
  status: "checkpointed",
  lane: `design_lane:${JSON.stringify(manifest.design_lane)}`,
  actor: "init-game-run.mjs",
  attempt: 1,
  input_artifact_paths: [`${runRel}/GAME_SEED.md`],
  owned_paths: [`${runRel}/**`],
  changed_paths: [
    `${runRel}/manifest.json`,
    `${runRel}/GAME_SEED.md`,
    `${runRel}/README_AGENT_BOOT.md`,
    `${runRel}/README_NEXT_ACTIONS.md`,
    `${runRel}/execution-ledger.jsonl`
  ],
  verification: {
    commands: [`node scripts/validate-artifacts.mjs --check run --seed-id ${seedId}`],
    status: "not-run",
    evidence: "init-game-run validated the manifest schema and path policy inline; the listed run-check has not executed yet and is the first action for the booting agent (completion is evidence, not prose)."
  },
  blockers: [],
  resume_point: {
    phase: "intake",
    artifact_path: `${runRel}/intake/office-hours.md`,
    reason: "Build the portfolio digest and complete the schema-gated intake grill."
  }
};

// --- Validation gates (run in every mode), via the run-state module ---
const manifestErrors = validateManifest(manifest);
if (manifestErrors.length) fail(`manifest does not validate:\n  ${manifestErrors.join("\n  ")}`);

const pathPolicyErrors = manifestPathPolicyErrors(manifest, seedId);
if (pathPolicyErrors.length) fail(pathPolicyErrors.join("; "));

const wouldCreate = ledgerRow.changed_paths.concat(RUN_DIRS.map((d) => `${runRel}/${d}/.gitkeep`));

if (dryRun) {
  const specPackAbsent = !fs.existsSync(specPackRoot);
  console.log(JSON.stringify({
    ok: true,
    mode: "dry-run",
    seed_id: seedId,
    design_lane: manifest.design_lane,
    would_create: wouldCreate,
    would_not_create: [specPackRoot, `${runRel}/GAME_THESIS.md`, "src/", "app/", "public/", "assets/"],
    validation: {
      seed_id: "passed",
      manifest_schema: "passed",
      path_policy: "passed",
      spec_pack_absent: specPackAbsent ? "passed" : "warn-exists"
    }
  }, null, 2));
  process.exit(0);
}

if (fs.existsSync(runDir) && !force) {
  fail(`run already exists at ${runRel} (use --force to overwrite owned files)`);
}

// Refuse to write through symlinks: --force must only touch real files the
// initializer owns inside runDir, never follow a symlink to an outside target.
if (fs.existsSync(runDir)) {
  const symlinked = symlinkWriteThroughPaths(runDir);
  if (symlinked.length) {
    fail(`refusing to write through symlink: ${path.relative(process.cwd(), symlinked[0])} (initializer writes only real files inside ${runRel})`);
  }
}

// --- Write (only inside runDir) ---
fs.mkdirSync(runDir, { recursive: true });
for (const subdir of RUN_DIRS) {
  fs.mkdirSync(path.join(runDir, subdir), { recursive: true });
  fs.writeFileSync(path.join(runDir, subdir, ".gitkeep"), "");
}
fs.writeFileSync(path.join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(path.join(runDir, "GAME_SEED.md"), seedDoc);
fs.writeFileSync(path.join(runDir, "README_AGENT_BOOT.md"), bootDoc);
fs.writeFileSync(path.join(runDir, "README_NEXT_ACTIONS.md"), nextDoc);

const ledgerFile = path.join(runDir, "execution-ledger.jsonl");
if (force && fs.existsSync(ledgerFile)) {
  fs.appendFileSync(ledgerFile, JSON.stringify({ ...ledgerRow, event: "run-reinitialized" }) + "\n");
} else {
  fs.writeFileSync(ledgerFile, JSON.stringify(ledgerRow) + "\n");
}

console.log(`[init-game-run] initialized ${runRel}`);
console.log(`[init-game-run] phase=intake  spec_pack=none (${specPackRoot} not created)`);
console.log(`[init-game-run] next: read ${runRel}/README_AGENT_BOOT.md`);
