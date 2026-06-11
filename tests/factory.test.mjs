import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../scripts/lib/validate-json-schema.mjs";
import { SKILLS, SCHEMAS, HOOKS, THRESHOLDS } from "../scripts/lib/factory-contract.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(REPO, ...p);

function node(script, args, opts = {}) {
  return spawnSync(process.execPath, [rel("scripts", script), ...args], { encoding: "utf8", ...opts });
}
function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tgf-test-"));
}
// A GAME_THESIS.md whose embedded ```json block is schema-valid (reuses the fixture).
function thesisMd() {
  const obj = fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8");
  return "# GAME_THESIS.md\n\n```json\n" + obj + "\n```\n";
}
function thesisMdWith(overrides) {
  const obj = {
    ...JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8")),
    ...overrides
  };
  return "# GAME_THESIS.md\n\n```json\n" + JSON.stringify(obj, null, 2) + "\n```\n";
}
// An engine decision md with a schema-valid embedded ```json block.
function engineMd(id, { status = "accepted", seedId = id } = {}) {
  const obj = { seed_id: seedId, status, decision: "x", profile: "p", rationale: "r", rejected: [], reversal_triggers: ["t"] };
  return "# ADR 0001\n\n```json\n" + JSON.stringify(obj) + "\n```\n";
}
// A gate-passing (ADVANCE) depth vector: total 18, all six required axes nonzero.
const ADVANCE_DV = {
  scores: { meaningful_choice: 2, tradeoff: 2, pressure: 2, uncertainty: 2, progression: 2, mastery: 2, combinatorial: 2, emergence: 2, replayable_variation: 2, failure_recovery: 0, expression: 0, expansion_headroom: 0 },
  total: 18, verdict: "ADVANCE"
};

test("all schemas parse and declare $schema/title/type", () => {
  for (const s of SCHEMAS) {
    const schema = JSON.parse(fs.readFileSync(rel("schemas", `${s}.schema.json`), "utf8"));
    assert.ok(schema.$schema, `${s} missing $schema`);
    assert.ok(schema.title, `${s} missing title`);
    assert.ok(schema.type, `${s} missing type`);
  }
});

test("seed-manifest schema rejects a malformed seed_id (pattern enforced)", () => {
  const schema = JSON.parse(fs.readFileSync(rel("schemas/seed-manifest.schema.json"), "utf8"));
  const good = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-seed-manifest.json"), "utf8"));
  assert.deepEqual(validate(schema, good), [], "valid manifest should pass");
  const bad = { ...good, seed_id: "BAD_ID!!" };
  assert.ok(validate(schema, bad).length > 0, "malformed seed_id must fail the pattern");
});

test("fixtures validate against their schemas", () => {
  const pairs = {
    "minimal-seed-manifest.json": "seed-manifest.schema.json",
    "minimal-game-thesis.json": "game-thesis.schema.json",
    "minimal-playtest-report.json": "playtest-report.schema.json",
    "minimal-depth-vector.json": "depth-vector.schema.json",
    "minimal-ledger-row.json": "execution-ledger-row.schema.json",
    "minimal-module-card.json": "module-card.schema.json"
  };
  for (const [fixture, schemaFile] of Object.entries(pairs)) {
    const schema = JSON.parse(fs.readFileSync(rel("schemas", schemaFile), "utf8"));
    const data = JSON.parse(fs.readFileSync(rel("examples/fixtures", fixture), "utf8"));
    assert.deepEqual(validate(schema, data), [], `${fixture} should validate`);
  }
});

test("init-game-run --dry-run writes nothing and emits contract JSON", () => {
  const dir = tmp();
  try {
    const r = node("init-game-run.mjs", ["--seed-id", "selftest-dry", "--seed", "a tiny test seed", "--dry-run"], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ok, true);
    assert.equal(out.mode, "dry-run");
    assert.ok(!fs.existsSync(path.join(dir, ".tgf")), "dry-run must not create .tgf");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("init-game-run creates only .tgf/seeds/{id} with valid manifest + ledger", () => {
  const dir = tmp();
  const id = "selftest-create";
  try {
    const r = node("init-game-run.mjs", ["--seed-id", id, "--seed", "a tiny test seed"], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    for (const f of ["manifest.json", "GAME_SEED.md", "README_AGENT_BOOT.md", "README_NEXT_ACTIONS.md", "execution-ledger.jsonl", "decisions/.gitkeep", "playtests/.gitkeep", "reviews/.gitkeep", "handoffs/.gitkeep"]) {
      assert.ok(fs.existsSync(path.join(runDir, f)), `expected ${f}`);
    }
    assert.ok(!fs.existsSync(path.join(runDir, "GAME_THESIS.md")), "must not create GAME_THESIS.md");
    assert.ok(!fs.existsSync(path.join(dir, "src")), "must not create src/");
    assert.ok(!fs.existsSync(`/home/ark/tgf-games/${id}`), "must not create child game repo");

    const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
    const schema = JSON.parse(fs.readFileSync(rel("schemas/seed-manifest.schema.json"), "utf8"));
    assert.deepEqual(validate(schema, manifest), []);
    assert.equal(manifest.external_side_effects_allowed, false);
    assert.equal(manifest.child_game_path, null);

    const firstRow = JSON.parse(fs.readFileSync(path.join(runDir, "execution-ledger.jsonl"), "utf8").trim().split("\n")[0]);
    const ledgerSchema = JSON.parse(fs.readFileSync(rel("schemas/execution-ledger-row.schema.json"), "utf8"));
    assert.deepEqual(validate(ledgerSchema, firstRow), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("init-game-run rejects invalid seed-id", () => {
  const dir = tmp();
  try {
    const r = node("init-game-run.mjs", ["--seed-id", "Bad_ID", "--seed", "x"], { cwd: dir });
    assert.notEqual(r.status, 0);
    assert.ok(!fs.existsSync(path.join(dir, ".tgf")));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("init-game-run refuses existing run without --force, succeeds with --force", () => {
  const dir = tmp();
  const id = "selftest-force";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    assert.notEqual(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x", "--force"], { cwd: dir }).status, 0);
    const rows = fs.readFileSync(path.join(dir, ".tgf/seeds", id, "execution-ledger.jsonl"), "utf8").trim().split("\n");
    assert.equal(rows.length, 2, "force should append a ledger row");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("init-game-run --force refuses to write through a symlinked owned path", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-symlink";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf/seeds", id);
    const target = path.join(outside, "outside-target.txt");
    fs.writeFileSync(target, "ORIGINAL");
    fs.rmSync(path.join(runDir, "manifest.json"));
    fs.symlinkSync(target, path.join(runDir, "manifest.json"));
    const r = node("init-game-run.mjs", ["--seed-id", id, "--seed", "x", "--force"], { cwd: dir });
    assert.notEqual(r.status, 0, "must refuse to write through a symlinked owned path");
    assert.equal(fs.readFileSync(target, "utf8"), "ORIGINAL", "outside target must be untouched");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("validate-artifacts --check schemas passes", () => {
  const r = node("validate-artifacts.mjs", ["--check", "schemas"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("validate-artifacts --check run passes for a created run", () => {
  const dir = tmp();
  const id = "selftest-runcheck";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// Drive an initialized run forward on disk: set manifest phase + artifact paths and
// append a ledger row per phase hop. Lets the run-check be tested on in-progress runs.
function advanceRun(dir, id, { phase, thesisPath, enginePath, ledgerPhases = [] }) {
  const runDir = path.join(dir, ".tgf", "seeds", id);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  manifest.current_phase = phase;
  if (thesisPath !== undefined) manifest.game_thesis_path = thesisPath;
  if (enginePath !== undefined) manifest.engine_decision_path = enginePath;
  fs.writeFileSync(path.join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const ledgerFile = path.join(runDir, "execution-ledger.jsonl");
  for (const p of ledgerPhases) {
    fs.appendFileSync(ledgerFile, JSON.stringify({
      ts: "2026-06-07T00:00:00.000Z", seed_id: id, phase: p, event: "phase-advance", status: "checkpointed", actor: "test"
    }) + "\n");
  }
  return runDir;
}

test("validate-artifacts --check run passes for an in-progress run past toolchain", () => {
  const dir = tmp();
  const id = "selftest-inprogress";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    advanceRun(dir, id, { phase: "engine-profile", thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`, ledgerPhases: ["thesis", "engine-profile"] });
    const r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr); // pre-fix this failed on the toolchain|intake clamp
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("validate-artifacts --check run flags manifest/ledger phase disagreement", () => {
  const dir = tmp();
  const id = "selftest-mismatch";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    advanceRun(dir, id, { phase: "thesis", thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`, ledgerPhases: ["thesis", "engine-profile"] });
    const r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /current_phase 'thesis' != latest ledger phase 'engine-profile'/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("validate-artifacts --check run rejects invalid seed-id before path derivation", () => {
  const dir = tmp();
  try {
    const r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", "../escape"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /invalid --seed-id/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("validate-artifacts --check run rejects symlinked run root, manifest, and ledger reads", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-run-read-symlink";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);

    const targetManifest = path.join(outside, "manifest.json");
    fs.writeFileSync(targetManifest, fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
    fs.rmSync(path.join(runDir, "manifest.json"));
    fs.symlinkSync(targetManifest, path.join(runDir, "manifest.json"));
    let r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /run manifest rejected: path must not traverse symlink/);

    fs.rmSync(path.join(runDir, "manifest.json"));
    const manifest = JSON.parse(fs.readFileSync(targetManifest, "utf8"));
    fs.writeFileSync(path.join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    const targetLedger = path.join(outside, "execution-ledger.jsonl");
    fs.writeFileSync(targetLedger, fs.readFileSync(path.join(runDir, "execution-ledger.jsonl"), "utf8"));
    fs.rmSync(path.join(runDir, "execution-ledger.jsonl"));
    fs.symlinkSync(targetLedger, path.join(runDir, "execution-ledger.jsonl"));
    r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /ledger rejected: path must not traverse symlink/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("validate-artifacts --check run rejects manifest and ledger seed-id mismatches", () => {
  const dir = tmp();
  const id = "selftest-run-id-mismatch";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const manifestPath = path.join(runDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, seed_id: "other-seed" }, null, 2) + "\n");
    let r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /manifest seed_id 'other-seed' does not match/);

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    const ledgerPath = path.join(runDir, "execution-ledger.jsonl");
    const row = JSON.parse(fs.readFileSync(ledgerPath, "utf8").trim().split("\n")[0]);
    fs.writeFileSync(ledgerPath, JSON.stringify({ ...row, seed_id: "other-seed" }) + "\n");
    r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /execution-ledger\.jsonl line 1: seed_id 'other-seed' does not match/);

    fs.writeFileSync(ledgerPath, JSON.stringify(row) + "\n" + JSON.stringify({ phase: "thesis", event: "missing-seed", status: "checkpointed", actor: "test", ts: "2026-06-07T00:00:00.000Z" }) + "\n");
    r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /execution-ledger\.jsonl line 2: seed_id 'undefined' does not match/);
    assert.match(r.stdout, /ledger row 2/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("validate-artifacts --check run flags a missing required thesis path downstream", () => {
  const dir = tmp();
  const id = "selftest-noartifact";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    advanceRun(dir, id, { phase: "engine-profile", thesisPath: null, ledgerPhases: ["thesis", "engine-profile"] });
    const r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /past 'thesis' but game_thesis_path is null/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("run-gates --dry-run proves all guards gate", () => {
  const r = node("run-gates.mjs", ["--dry-run"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("advance-run performs a legal phase transition and keeps the run valid", () => {
  const dir = tmp();
  const id = "selftest-advance";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const r = node("advance-run.mjs", ["--seed-id", id, "--to", "thesis", "--event", "thesis-compiled",
      "--status", "passed", "--set", `game_thesis_path=.tgf/seeds/${id}/GAME_THESIS.md`], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    fs.writeFileSync(path.join(dir, ".tgf", "seeds", id, "GAME_THESIS.md"), thesisMd());
    const m = JSON.parse(fs.readFileSync(path.join(dir, ".tgf", "seeds", id, "manifest.json"), "utf8"));
    assert.equal(m.current_phase, "thesis");
    assert.equal(m.game_thesis_path, `.tgf/seeds/${id}/GAME_THESIS.md`);
    const chk = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(chk.status, 0, chk.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("advance-run refuses an illegal phase transition", () => {
  const dir = tmp();
  const id = "selftest-illegal";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const r = node("advance-run.mjs", ["--seed-id", id, "--to", "fun-lock", "--event", "skip"], { cwd: dir });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /illegal transition toolchain -> fun-lock/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("advance-run rejects invalid seed-id before path derivation", () => {
  const dir = tmp();
  try {
    const r = node("advance-run.mjs", ["--seed-id", "../escape", "--to", "thesis", "--event", "t"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /invalid --seed-id/);
    assert.ok(!fs.existsSync(path.join(dir, ".tgf", "escape")), "invalid seed id must not derive a run path");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("advance-run refuses to write manifest or ledger through symlinks", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-advance-symlink";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const targetManifest = path.join(outside, "manifest.json");
    const originalManifest = fs.readFileSync(path.join(runDir, "manifest.json"), "utf8");
    fs.writeFileSync(targetManifest, originalManifest);
    fs.rmSync(path.join(runDir, "manifest.json"));
    fs.symlinkSync(targetManifest, path.join(runDir, "manifest.json"));
    let r = node("advance-run.mjs", ["--seed-id", id, "--to", "thesis", "--event", "t"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /manifest\.json.*symlink|must not traverse symlink/);
    assert.equal(fs.readFileSync(targetManifest, "utf8"), originalManifest, "outside manifest target must stay unchanged");

    fs.rmSync(path.join(runDir, "manifest.json"));
    fs.writeFileSync(path.join(runDir, "manifest.json"), originalManifest);
    const targetLedger = path.join(outside, "ledger.jsonl");
    const originalLedger = fs.readFileSync(path.join(runDir, "execution-ledger.jsonl"), "utf8");
    fs.writeFileSync(targetLedger, originalLedger);
    fs.rmSync(path.join(runDir, "execution-ledger.jsonl"));
    fs.symlinkSync(targetLedger, path.join(runDir, "execution-ledger.jsonl"));
    r = node("advance-run.mjs", ["--seed-id", id, "--to", "thesis", "--event", "t"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /execution-ledger\.jsonl.*symlink|must not traverse symlink/);
    assert.equal(fs.readFileSync(targetLedger, "utf8"), originalLedger, "outside ledger target must stay unchanged");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("advance-run refuses a transition that would invalidate the manifest", () => {
  const dir = tmp();
  const id = "selftest-invalidates";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    assert.equal(node("advance-run.mjs", ["--seed-id", id, "--to", "thesis", "--event", "t"], { cwd: dir }).status, 0);
    const r = node("advance-run.mjs", ["--seed-id", id, "--to", "engine-profile", "--event", "e"], { cwd: dir });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /past 'thesis' but game_thesis_path is null/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("advance-run refuses manifest artifact paths outside the seed run", () => {
  const dir = tmp();
  const id = "selftest-path-policy";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const r = node("advance-run.mjs", ["--seed-id", id, "--to", "thesis", "--event", "t",
      "--set", "game_thesis_path=/tmp/outside-thesis.md"], { cwd: dir });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /game_thesis_path must resolve inside/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("advance-run refuses to append when the existing ledger is invalid", () => {
  const dir = tmp();
  const id = "selftest-advance-bad-ledger";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const ledgerPath = path.join(dir, ".tgf", "seeds", id, "execution-ledger.jsonl");
    const before = fs.readFileSync(ledgerPath, "utf8");
    const first = JSON.parse(before.trim().split("\n")[0]);
    fs.writeFileSync(ledgerPath, JSON.stringify(first) + "\n" + JSON.stringify({ ...first, seed_id: "other-seed", event: "tampered" }) + "\n");
    const r = node("advance-run.mjs", ["--seed-id", id, "--to", "thesis", "--event", "t"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /ledger invalid/);
    assert.match(r.stderr, /seed_id 'other-seed' does not match/);
    assert.equal(fs.readFileSync(ledgerPath, "utf8").trim().split("\n").length, 2, "advance-run must not append after ledger preflight failure");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("validate-artifacts --check thesis validates a run's embedded thesis, and run-check enforces it", () => {
  const dir = tmp();
  const id = "selftest-thesis";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const thesisObj = fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8");
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), "# GAME_THESIS.md\n\n```json\n" + thesisObj + "\n```\n");
    assert.equal(node("advance-run.mjs", ["--seed-id", id, "--to", "thesis", "--event", "t",
      "--set", `game_thesis_path=.tgf/seeds/${id}/GAME_THESIS.md`], { cwd: dir }).status, 0);
    assert.equal(node("validate-artifacts.mjs", ["--check", "thesis", "--seed-id", id], { cwd: dir }).status, 0);
    assert.equal(node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir }).status, 0);
    // corrupt the thesis json block -> run-check now fails on thesis content
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), "# GAME_THESIS.md\n\n```json\n{ \"seed\": \"x\" }\n```\n");
    const r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /thesis /);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("validate-artifacts --check thesis rejects manifest paths outside or symlinked from the run", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-thesis-path-policy";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const manifestPath = path.join(runDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const outsideThesis = path.join(outside, "GAME_THESIS.md");
    fs.writeFileSync(outsideThesis, thesisMd());
    fs.symlinkSync(outside, path.join(runDir, "linked"));

    manifest.game_thesis_path = outsideThesis;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    let r = node("validate-artifacts.mjs", ["--check", "thesis", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /game_thesis_path must resolve inside/);

    manifest.game_thesis_path = `.tgf/seeds/${id}/linked/GAME_THESIS.md`;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    r = node("validate-artifacts.mjs", ["--check", "thesis", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /game_thesis_path must not traverse symlink/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("validate-artifacts --check thesis --file is confined by seed-id", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-thesis-file-policy";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    let r = node("validate-artifacts.mjs", ["--check", "thesis", "--file", `.tgf/seeds/${id}/GAME_THESIS.md`], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /requires --seed-id/);
    r = node("validate-artifacts.mjs", ["--check", "thesis", "--seed-id", id, "--file", `.tgf/seeds/${id}/GAME_THESIS.md`], { cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const outsideThesis = path.join(outside, "GAME_THESIS.md");
    fs.writeFileSync(outsideThesis, thesisMd());
    r = node("validate-artifacts.mjs", ["--check", "thesis", "--seed-id", id, "--file", outsideThesis], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /file must resolve inside/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("validate-artifacts --check run gates fun-lock on a passing depth vector", () => {
  const dir = tmp();
  const id = "selftest-funlock";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "fun-lock",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch", "first-slice", "depth-review", "bakeoff", "fun-lock"]
    });
    // fun-lock with NO depth vector -> fail
    let r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /at\/past fun-lock but reviews\/ has no gate-passing depth vector/);
    // add a gate-passing ADVANCE depth vector -> pass
    fs.mkdirSync(path.join(runDir, "reviews", "winner"), { recursive: true });
    fs.writeFileSync(path.join(runDir, "reviews", "winner", "depth-vector.json"), JSON.stringify(ADVANCE_DV));
    r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 0, r.stdout);
    // a symlinked depth vector must not satisfy the gate with outside evidence
    const outside = tmp();
    const targetDepth = path.join(outside, "depth-vector.json");
    fs.writeFileSync(targetDepth, JSON.stringify(ADVANCE_DV));
    fs.rmSync(path.join(runDir, "reviews", "winner", "depth-vector.json"));
    fs.symlinkSync(targetDepth, path.join(runDir, "reviews", "winner", "depth-vector.json"));
    r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /reviews depth vector must not be a symlink/);
    fs.rmSync(outside, { recursive: true, force: true });
    fs.rmSync(path.join(runDir, "reviews", "winner", "depth-vector.json"));
    fs.writeFileSync(path.join(runDir, "reviews", "winner", "depth-vector.json"), JSON.stringify(ADVANCE_DV));
    // a DEEPEN-only vector does not satisfy the gate
    fs.writeFileSync(path.join(runDir, "reviews", "winner", "depth-vector.json"), JSON.stringify({ ...ADVANCE_DV, verdict: "DEEPEN" }));
    r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("advance-run --dry-run writes nothing", () => {
  const dir = tmp();
  const id = "selftest-advdry";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const ledgerPath = path.join(dir, ".tgf", "seeds", id, "execution-ledger.jsonl");
    const before = fs.readFileSync(ledgerPath, "utf8");
    const r = node("advance-run.mjs", ["--seed-id", id, "--to", "thesis", "--event", "t", "--dry-run"], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).mode, "dry-run");
    assert.equal(fs.readFileSync(ledgerPath, "utf8"), before, "ledger unchanged");
    const m = JSON.parse(fs.readFileSync(path.join(dir, ".tgf", "seeds", id, "manifest.json"), "utf8"));
    assert.equal(m.current_phase, "toolchain", "manifest unchanged");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("emit-local-issues refuses before an engine decision exists", () => {
  const dir = tmp();
  const id = "selftest-emit-blocked";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    assert.equal(node("advance-run.mjs", ["--seed-id", id, "--to", "thesis", "--event", "t",
      "--set", `game_thesis_path=.tgf/seeds/${id}/GAME_THESIS.md`], { cwd: dir }).status, 0);
    const r = node("emit-local-issues.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /before an engine decision exists/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("emit-local-issues rejects seed-id traversal before path derivation", () => {
  const dir = tmp();
  const outside = path.join(dir, "..", "escape-run-first-slice.md");
  try {
    const r = node("emit-local-issues.mjs", ["--seed-id", "../escape-run", "--write"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /invalid --seed-id/);
    assert.ok(!fs.existsSync(outside), "seed traversal must not write outside issue root");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("emit-local-issues requires an accepted engine decision for the same seed", () => {
  const dir = tmp();
  const id = "selftest-emit-engine-status";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id, { status: "rejected" }));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    let r = node("emit-local-issues.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /engine decision must be accepted/);
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id, { seedId: "other-seed" }));
    r = node("emit-local-issues.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /does not match --seed-id/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("emit-local-issues rejects manifest artifact paths outside the seed run", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-emit-path-policy";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const outsideThesis = path.join(outside, "GAME_THESIS.md");
    fs.writeFileSync(outsideThesis, thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
    manifest.current_phase = "prototype-dispatch";
    manifest.game_thesis_path = outsideThesis;
    manifest.engine_decision_path = `.tgf/seeds/${id}/decisions/0001-engine-profile.md`;
    fs.writeFileSync(path.join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    const r = node("emit-local-issues.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /game_thesis_path must resolve inside/);
    assert.ok(!fs.existsSync(path.join(dir, ".tgf", "issues")), "unsafe manifest must not emit issues");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("emit-local-issues dry-runs seed backlog without writing by default", () => {
  const dir = tmp();
  const id = "selftest-emit";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    const r = node("emit-local-issues.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /# Dry-run local issues/);
    assert.match(r.stdout, /id: selftest-emit-first-slice/);
    assert.match(r.stdout, /title: 'selftest-emit: build first playable slice'/);
    assert.match(r.stdout, /state: ready-for-agent/);
    assert.match(r.stdout, /id: selftest-emit-depth-review/);
    assert.match(r.stdout, /state: needs-info/);
    assert.ok(!fs.existsSync(path.join(dir, ".tgf", "issues")), "dry-run must not write issue files");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("emit-local-issues --write creates validator-clean local issues", () => {
  const dir = tmp();
  const id = "selftest-emit-write";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    const r = node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(dir, ".tgf", "issues", `${id}-first-slice.md`)));
    assert.ok(fs.existsSync(path.join(dir, ".tgf", "issues", `${id}-depth-review.md`)));
    const chk = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(chk.status, 0, chk.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("emit-local-issues normalizes multiline front-matter source strings before writing", () => {
  const dir = tmp();
  const id = "selftest-emit-yaml-safe";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMdWith({
      bot_success_criteria: [
        "bot survives line one\n---\nline two",
        "player's route remains testable"
      ]
    }));
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    const r = node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const issue = fs.readFileSync(path.join(dir, ".tgf", "issues", `${id}-first-slice.md`), "utf8");
    assert.equal((issue.match(/^---$/gm) || []).length, 2, "issue must contain exactly one front-matter block");
    assert.match(issue, /bot survives line one --- line two/);
    assert.match(issue, /player''s route remains testable/);
    const chk = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(chk.status, 0, chk.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("emit-local-issues rejects out-dir outside .tgf/issues", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-emit-outdir";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    const r = node("emit-local-issues.mjs", ["--seed-id", id, "--write", "--out-dir", outside], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /must be \.tgf\/issues/);
    assert.equal(fs.readdirSync(outside).length, 0, "outside dir must remain untouched");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("emit-local-issues rejects symlinked issue output paths", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-emit-symlink";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    fs.mkdirSync(path.join(dir, ".tgf"), { recursive: true });
    fs.symlinkSync(outside, path.join(dir, ".tgf", "issues"));
    const r = node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /cannot traverse symlink/);
    assert.equal(fs.readdirSync(outside).length, 0, "symlink target must remain untouched");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("emit-local-issues refuses to overwrite symlinked issue files", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-emit-file-symlink";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    const issuesDir = path.join(dir, ".tgf", "issues");
    fs.mkdirSync(issuesDir, { recursive: true });
    const target = path.join(outside, "outside.md");
    fs.writeFileSync(target, "ORIGINAL");
    fs.symlinkSync(target, path.join(issuesDir, `${id}-first-slice.md`));
    const r = node("emit-local-issues.mjs", ["--seed-id", id, "--write", "--force"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /issue file cannot be a symlink/);
    assert.equal(fs.readFileSync(target, "utf8"), "ORIGINAL", "symlink target must remain untouched");
    assert.ok(!fs.existsSync(path.join(issuesDir, `${id}-depth-review.md`)), "preflight must block all writes");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("walk-game-idea initializes a seed and writes an architectural walkthrough", () => {
  const dir = tmp();
  const id = "selftest-walk";
  try {
    const r = node("walk-game-idea.mjs", ["--seed-id", id, "--seed", "tiny river blacksmith"], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Architectural decision ladder/);
    assert.match(r.stdout, /- seed: tiny river blacksmith/);
    assert.match(r.stdout, /compile the seed into a falsifiable GAME_THESIS/);
    const walk = path.join(dir, ".tgf", "seeds", id, "IDEA_WALKTHROUGH.md");
    assert.ok(fs.existsSync(walk), "walkthrough must be written into run state");
    assert.match(fs.readFileSync(walk, "utf8"), /Backlog decomposition is blocked until GAME_THESIS\.md validates/);
    const chk = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(chk.status, 0, chk.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("walk-game-idea rejects seed-id traversal before path derivation", () => {
  const dir = tmp();
  const outside = path.join(dir, "..", "walk-breach");
  try {
    const r = node("walk-game-idea.mjs", ["--seed-id", "../walk-breach", "--seed", "x"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /invalid --seed-id/);
    assert.ok(!fs.existsSync(outside), "seed traversal must not write outside run root");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("walk-game-idea refuses to write walkthrough or ledger through symlinks", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-walk-symlink";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const targetWalk = path.join(outside, "walkthrough.md");
    fs.writeFileSync(targetWalk, "ORIGINAL");
    fs.symlinkSync(targetWalk, path.join(runDir, "IDEA_WALKTHROUGH.md"));
    let r = node("walk-game-idea.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /IDEA_WALKTHROUGH\.md.*symlink|must not traverse symlink/);
    assert.equal(fs.readFileSync(targetWalk, "utf8"), "ORIGINAL", "outside walkthrough target must stay unchanged");

    fs.rmSync(path.join(runDir, "IDEA_WALKTHROUGH.md"));
    const targetLedger = path.join(outside, "ledger.jsonl");
    const originalLedger = fs.readFileSync(path.join(runDir, "execution-ledger.jsonl"), "utf8");
    fs.writeFileSync(targetLedger, originalLedger);
    fs.rmSync(path.join(runDir, "execution-ledger.jsonl"));
    fs.symlinkSync(targetLedger, path.join(runDir, "execution-ledger.jsonl"));
    r = node("walk-game-idea.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /execution-ledger\.jsonl.*symlink|must not traverse symlink/);
    assert.equal(fs.readFileSync(targetLedger, "utf8"), originalLedger, "outside ledger target must stay unchanged");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("walk-game-idea --write-issues preflights run writes before emitting issues", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-walk-write-preflight";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    const targetWalk = path.join(outside, "walkthrough.md");
    fs.writeFileSync(targetWalk, "ORIGINAL");
    fs.symlinkSync(targetWalk, path.join(runDir, "IDEA_WALKTHROUGH.md"));
    const r = node("walk-game-idea.mjs", ["--seed-id", id, "--write-issues"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /IDEA_WALKTHROUGH\.md.*symlink|must not traverse symlink/);
    assert.ok(!fs.existsSync(path.join(dir, ".tgf", "issues")), "issue files must not be emitted before run writes preflight");
    assert.equal(fs.readFileSync(targetWalk, "utf8"), "ORIGINAL", "outside walkthrough target must stay unchanged");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("walk-game-idea refuses to read seed text through a symlink", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "selftest-walk-seed-symlink";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const targetSeed = path.join(outside, "GAME_SEED.md");
    fs.writeFileSync(targetSeed, "# GAME_SEED.md\n\noutside secret\n");
    fs.rmSync(path.join(runDir, "GAME_SEED.md"));
    fs.symlinkSync(targetSeed, path.join(runDir, "GAME_SEED.md"));
    const r = node("walk-game-idea.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /seed_path must not traverse symlink/);
    assert.doesNotMatch(r.stdout, /outside secret/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("walk-game-idea refuses to continue with ledger parse or seed errors", () => {
  const dir = tmp();
  const id = "selftest-walk-bad-ledger";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const ledgerPath = path.join(runDir, "execution-ledger.jsonl");
    const first = JSON.parse(fs.readFileSync(ledgerPath, "utf8").trim().split("\n")[0]);
    fs.writeFileSync(ledgerPath, JSON.stringify(first) + "\n" + JSON.stringify({ ...first, seed_id: "other-seed", event: "tampered" }) + "\n");
    let r = node("walk-game-idea.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /ledger invalid/);
    assert.match(r.stderr, /seed_id 'other-seed' does not match/);

    fs.writeFileSync(ledgerPath, JSON.stringify(first) + "\n" + "{ bad json\n");
    r = node("walk-game-idea.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /not valid JSON/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("walk-game-idea rejects no-write with issue writes", () => {
  const dir = tmp();
  const id = "selftest-walk-nowrite";
  try {
    const r = node("walk-game-idea.mjs", ["--seed-id", id, "--seed", "x", "--no-write", "--write-issues"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /--no-write cannot be combined with --write-issues/);
    assert.ok(!fs.existsSync(path.join(dir, ".tgf")), "no state should be written");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("walk-game-idea explains a non-accepted engine decision without emitting issues", () => {
  const dir = tmp();
  const id = "selftest-walk-rejected-engine";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id, { status: "rejected" }));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    const r = node("walk-game-idea.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Engine\/profile decision/);
    assert.match(r.stdout, /current status is rejected/);
    assert.doesNotMatch(r.stdout, new RegExp(`id: ${id}-first-slice`));
    assert.ok(fs.existsSync(path.join(runDir, "IDEA_WALKTHROUGH.md")), "blocked walkthrough should still be written");
    assert.ok(!fs.existsSync(path.join(dir, ".tgf", "issues")), "blocked decomposition must not write issues");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("walk-game-idea previews local issue decomposition after thesis and engine ADR", () => {
  const dir = tmp();
  const id = "selftest-walk-ready";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    const r = node("walk-game-idea.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Thesis anchors/);
    assert.match(r.stdout, /Engine\/profile decision/);
    assert.match(r.stdout, /id: selftest-walk-ready-first-slice/);
    assert.ok(!fs.existsSync(path.join(dir, ".tgf", "issues")), "walkthrough previews issues without writing them");
    const chk = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(chk.status, 0, chk.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("walk-game-idea --write-issues records emitted local issues in the run ledger", () => {
  const dir = tmp();
  const id = "selftest-walk-write";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    const r = node("walk-game-idea.mjs", ["--seed-id", id, "--write-issues"], { cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(fs.existsSync(path.join(dir, ".tgf", "issues", `${id}-first-slice.md`)));
    assert.ok(fs.existsSync(path.join(dir, ".tgf", "issues", `${id}-depth-review.md`)));
    const ledgerRows = fs.readFileSync(path.join(runDir, "execution-ledger.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
    const last = ledgerRows.at(-1);
    assert.deepEqual(last.changed_paths, [
      `.tgf/seeds/${id}/IDEA_WALKTHROUGH.md`,
      `.tgf/issues/${id}-first-slice.md`,
      `.tgf/issues/${id}-depth-review.md`
    ]);
    assert.match(last.verification.evidence, /local issue files emitted/);
    const chk = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(chk.status, 0, chk.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("walk-game-idea write-issues preserves existing local issues unless force is explicit", () => {
  const dir = tmp();
  const id = "selftest-walk-collision";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd());
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id));
    advanceRun(dir, id, {
      phase: "prototype-dispatch",
      thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
      enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
      ledgerPhases: ["thesis", "engine-profile", "prototype-dispatch"]
    });
    const issuesDir = path.join(dir, ".tgf", "issues");
    fs.mkdirSync(issuesDir, { recursive: true });
    const existing = path.join(issuesDir, `${id}-first-slice.md`);
    fs.writeFileSync(existing, "keep me");
    const r = node("walk-game-idea.mjs", ["--seed-id", id, "--write-issues"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /exists; pass --force/);
    assert.equal(fs.readFileSync(existing, "utf8"), "keep me");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("factory-contract registry matches the filesystem", () => {
  for (const s of SKILLS) assert.ok(fs.existsSync(rel(".codex/skills", s, "SKILL.md")), `skill file for ${s}`);
  for (const s of SCHEMAS) assert.ok(fs.existsSync(rel("schemas", `${s}.schema.json`)), `schema file for ${s}`);
  for (const h of HOOKS) assert.ok(fs.existsSync(rel("hooks", `${h}.mjs`)), `hook file for ${h}`);
  // and no stray files the registry forgot
  assert.equal(fs.readdirSync(rel(".codex/skills")).filter((d) => fs.existsSync(rel(".codex/skills", d, "SKILL.md"))).length, SKILLS.length, "skill count");
  assert.equal(fs.readdirSync(rel("schemas")).filter((f) => f.endsWith(".schema.json")).length, SCHEMAS.length, "schema count");
  assert.equal(fs.readdirSync(rel("hooks")).filter((f) => f.endsWith(".mjs")).length, HOOKS.length, "hook count");
});

test("schemas reject undeclared properties (additionalProperties:false)", () => {
  const pairs = {
    "minimal-seed-manifest.json": "seed-manifest.schema.json",
    "minimal-game-thesis.json": "game-thesis.schema.json",
    "minimal-playtest-report.json": "playtest-report.schema.json",
    "minimal-depth-vector.json": "depth-vector.schema.json",
    "minimal-ledger-row.json": "execution-ledger-row.schema.json",
    "minimal-module-card.json": "module-card.schema.json"
  };
  for (const [fixture, schemaFile] of Object.entries(pairs)) {
    const schema = JSON.parse(fs.readFileSync(rel("schemas", schemaFile), "utf8"));
    const data = JSON.parse(fs.readFileSync(rel("examples/fixtures", fixture), "utf8"));
    assert.deepEqual(validate(schema, data), [], `${fixture} should still validate`);
    const errs = validate(schema, { ...data, injected_evil_field: "x" });
    assert.ok(errs.some((e) => /additional property/.test(e)), `${fixture} must reject an injected field`);
  }
});

test("validate-artifacts --check issues validates local issue files", () => {
  const dir = tmp();
  try {
    const issues = path.join(dir, ".tgf", "issues");
    fs.mkdirSync(issues, { recursive: true });
    fs.writeFileSync(path.join(issues, "add-guard.md"), "---\nid: add-guard\ntitle: T\ntype: chore\nstate: needs-triage\nafk: ready-for-agent\nacceptance:\n  - prove the guard blocks the unsafe case\nevidence:\n  - docs/hooks-and-guards.md\n---\nbody\n");
    let r = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(r.status, 0, r.stdout);
    fs.writeFileSync(path.join(issues, "broken.md"), "---\nid: wrong-id\ntitle: T\ntype: epic\nstate: needs-triage\nafk: ready-for-agent\nacceptance:\n  - prove something\nevidence:\n  - docs/hooks-and-guards.md\n---\n");
    r = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /type 'epic' not in|must match filename/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("validate-artifacts --check issues rejects unknown state and afk values", () => {
  const dir = tmp();
  try {
    const issues = path.join(dir, ".tgf", "issues");
    fs.mkdirSync(issues, { recursive: true });
    fs.writeFileSync(path.join(issues, "bad-readiness.md"), "---\nid: bad-readiness\ntitle: T\ntype: chore\nstate: blocked\nafk: maybe\nacceptance:\n  - prove something\nevidence:\n  - docs/hooks-and-guards.md\n---\nbody\n");
    const r = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /state 'blocked' not in/);
    assert.match(r.stdout, /afk 'maybe' not in/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("validate-artifacts --check issues requires acceptance and ready evidence", () => {
  const dir = tmp();
  try {
    const issues = path.join(dir, ".tgf", "issues");
    fs.mkdirSync(issues, { recursive: true });
    fs.writeFileSync(path.join(issues, "missing-proof.md"), "---\nid: missing-proof\ntitle: T\ntype: slice\nstate: ready-for-agent\nafk: ready-for-agent\nacceptance:\nevidence:\n---\nbody\n");
    const r = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /acceptance must list at least one/);
    assert.match(r.stdout, /ready-for-agent issues must include at least one evidence link/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("validate-artifacts --check issues rejects a symlinked issue directory", () => {
  const dir = tmp();
  const outside = tmp();
  try {
    fs.mkdirSync(path.join(dir, ".tgf"), { recursive: true });
    fs.writeFileSync(path.join(outside, "outside.md"), "---\nid: outside\ntitle: T\ntype: chore\nstate: needs-info\nafk: needs-human\nacceptance:\n  - prove something\nevidence:\n---\nbody\n");
    fs.symlinkSync(outside, path.join(dir, ".tgf", "issues"));
    const r = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /issue directory must not traverse symlink/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("validate-artifacts --check issues rejects a symlinked .tgf parent", () => {
  const dir = tmp();
  const outside = tmp();
  try {
    const outsideIssues = path.join(outside, "issues");
    fs.mkdirSync(outsideIssues, { recursive: true });
    fs.writeFileSync(path.join(outsideIssues, "escaped-issue.md"), "---\nid: escaped-issue\ntitle: T\ntype: chore\nstate: needs-info\nafk: needs-human\nacceptance:\n  - prove something\nevidence:\n---\nbody\n");
    fs.symlinkSync(outside, path.join(dir, ".tgf"));
    const r = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /issue directory must not traverse symlink: \.tgf/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("validate-artifacts --check issues rejects symlinked issue files", () => {
  const dir = tmp();
  const outside = tmp();
  try {
    const issues = path.join(dir, ".tgf", "issues");
    fs.mkdirSync(issues, { recursive: true });
    const target = path.join(outside, "outside.md");
    fs.writeFileSync(target, "---\nid: linked-issue\ntitle: T\ntype: chore\nstate: needs-info\nafk: needs-human\nacceptance:\n  - prove something\nevidence:\n---\nbody\n");
    fs.symlinkSync(target, path.join(issues, "linked-issue.md"));
    const r = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /linked-issue\.md: issue file must not be a symlink/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("validate-artifacts --check issues is a no-op when .tgf/issues is absent", () => {
  const dir = tmp();
  try {
    const r = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(r.status, 0, r.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("registry gate thresholds stay in sync with factory.config.toml", () => {
  const toml = fs.readFileSync(rel("factory.config.toml"), "utf8");
  const num = (key) => {
    const m = toml.match(new RegExp(`^${key}\\s*=\\s*([0-9.]+)`, "m"));
    assert.ok(m, `factory.config.toml missing ${key}`);
    return Number(m[1]);
  };
  assert.equal(num("depth_vector_min_total"), THRESHOLDS.depth_vector_min_total);
  assert.equal(num("dominant_move_max_action_share"), THRESHOLDS.dominant_move_max_action_share);
  assert.equal(num("minimum_bot_session_seconds"), THRESHOLDS.minimum_bot_session_seconds);
  assert.equal(num("nightly_bot_session_seconds"), THRESHOLDS.nightly_bot_session_seconds);
});
