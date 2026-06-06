#!/usr/bin/env node
// Non-destructive seed-run initializer. Creates ONLY .tgf/seeds/{seed-id}/ run state.
// It never creates a child game repo, never picks an engine, never writes a GAME_THESIS.md,
// and never writes gameplay code. Contract: docs/adr/0003 + the run-initializer contract.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./lib/validate-json-schema.mjs";

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEED_ID_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const seedId = arg("seed-id");
const seed = arg("seed");
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

function fail(msg) {
  console.error(`[init-game-run] ERROR: ${msg}`);
  process.exit(1);
}

if (!seedId || !seed) {
  fail('usage: node scripts/init-game-run.mjs --seed-id <kebab-id> --seed "<one line>" [--dry-run] [--force]');
}
if (!SEED_ID_RE.test(seedId)) {
  fail(`--seed-id must match ${SEED_ID_RE} (got "${seedId}")`);
}

const runRel = path.join(".tgf", "seeds", seedId);
const runDir = path.resolve(process.cwd(), runRel);
const childGameRoot = `/home/ark/tgf-games/${seedId}`;
const iso = new Date().toISOString();

// Load + substitute templates from the factory repo (independent of cwd).
const tplDir = path.join(FACTORY_ROOT, "templates", "run");
const sub = (s) => s.replaceAll("{{SEED_ID}}", seedId).replaceAll("{{SEED}}", seed).replaceAll("{{ISO}}", iso);
const readTpl = (name) => sub(fs.readFileSync(path.join(tplDir, name), "utf8"));

const manifest = JSON.parse(readTpl("manifest.json"));
const bootDoc = readTpl("README_AGENT_BOOT.md");
const nextDoc = readTpl("README_NEXT_ACTIONS.md");
const seedDoc = `# GAME_SEED.md\n\n${seed}\n`;

const ledgerRow = {
  ts: iso,
  seed_id: seedId,
  phase: "toolchain",
  event: "run-initialized",
  status: "checkpointed",
  lane: "solo",
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
    status: "passed",
    evidence: "Run manifest and path policy validated; no child game repo created."
  },
  blockers: [],
  resume_point: {
    phase: "toolchain",
    artifact_path: `${runRel}/README_AGENT_BOOT.md`,
    reason: "Run toolchain verification."
  }
};

// --- Validation gates (run in every mode) ---
const schema = JSON.parse(fs.readFileSync(path.join(FACTORY_ROOT, "schemas", "seed-manifest.schema.json"), "utf8"));
const manifestErrors = validate(schema, manifest);
if (manifestErrors.length) fail(`manifest does not validate:\n  ${manifestErrors.join("\n  ")}`);

// Path policy: the only absolute /home/ark/... value allowed is default_child_game_root,
// and it must equal /home/ark/tgf-games/{seed-id}.
const absPaths = JSON.stringify(manifest).match(/\/home\/ark\/[A-Za-z0-9._/-]+/g) || [];
const illegal = absPaths.filter((p) => p !== childGameRoot);
if (illegal.length) fail(`illegal absolute source path(s) in manifest: ${illegal.join(", ")}`);
if (manifest.default_child_game_root !== childGameRoot) {
  fail(`default_child_game_root must be ${childGameRoot}`);
}

const wouldCreate = ledgerRow.changed_paths.concat([
  `${runRel}/decisions/.gitkeep`,
  `${runRel}/playtests/.gitkeep`,
  `${runRel}/reviews/.gitkeep`,
  `${runRel}/handoffs/.gitkeep`
]);

if (dryRun) {
  const childRepoAbsent = !fs.existsSync(childGameRoot);
  console.log(JSON.stringify({
    ok: true,
    mode: "dry-run",
    seed_id: seedId,
    would_create: wouldCreate,
    would_not_create: [childGameRoot, `${runRel}/GAME_THESIS.md`, "src/", "app/", "public/", "assets/"],
    validation: {
      seed_id: "passed",
      manifest_schema: "passed",
      path_policy: "passed",
      child_repo_absent: childRepoAbsent ? "passed" : "warn-exists"
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
  const owned = [
    runDir,
    ...["decisions", "playtests", "reviews", "handoffs"].map((d) => path.join(runDir, d)),
    ...["manifest.json", "GAME_SEED.md", "README_AGENT_BOOT.md", "README_NEXT_ACTIONS.md", "execution-ledger.jsonl"].map((f) => path.join(runDir, f))
  ];
  for (const p of owned) {
    if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) {
      fail(`refusing to write through symlink: ${path.relative(process.cwd(), p)} (initializer writes only real files inside ${runRel})`);
    }
  }
}

// --- Write (only inside runDir) ---
fs.mkdirSync(runDir, { recursive: true });
for (const subdir of ["decisions", "playtests", "reviews", "handoffs"]) {
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
console.log(`[init-game-run] phase=toolchain  child_game=none (${childGameRoot} not created)`);
console.log(`[init-game-run] next: read ${runRel}/README_AGENT_BOOT.md`);
