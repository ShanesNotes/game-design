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
// An engine decision md with a schema-valid embedded ```json block.
function engineMd(id) {
  const obj = { seed_id: id, status: "accepted", decision: "x", profile: "p", rationale: "r", rejected: [], reversal_triggers: ["t"] };
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
    "minimal-ledger-row.json": "execution-ledger-row.schema.json"
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
    "minimal-ledger-row.json": "execution-ledger-row.schema.json"
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
    fs.writeFileSync(path.join(issues, "add-guard.md"), "---\nid: add-guard\ntitle: T\ntype: chore\nstate: needs-triage\nafk: ready-for-agent\n---\nbody\n");
    let r = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(r.status, 0, r.stdout);
    fs.writeFileSync(path.join(issues, "broken.md"), "---\nid: wrong-id\ntitle: T\ntype: epic\nstate: needs-triage\nafk: ready-for-agent\n---\n");
    r = node("validate-artifacts.mjs", ["--check", "issues"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /type 'epic' not in|must match filename/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
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
