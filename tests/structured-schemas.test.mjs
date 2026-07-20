// T05 — structured feel_targets + typed acceptance (SPEC §3.3).
// Also: subset validator keyword regressions (maxLength / minLength / uniqueItems).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../scripts/lib/validate-json-schema.mjs";
import { readEmbeddedArtifact } from "../scripts/lib/run-state.mjs";
import { FEEL_TARGET_REQUIRED_FOR_ADVANCE } from "../scripts/lib/anti-boring-gate.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(REPO, ...p);

// --- subset validator keywords used by live schemas ---
test("validate enforces maxLength (fire and pass)", () => {
  assert.deepEqual(validate({ type: "string", maxLength: 3 }, "abc"), []);
  const errs = validate({ type: "string", maxLength: 3 }, "abcd");
  assert.ok(errs.some((e) => /maxLength/.test(e)), errs.join("\n"));
});

test("validate enforces minLength (fire and pass)", () => {
  assert.deepEqual(validate({ type: "string", minLength: 1 }, "x"), []);
  const errs = validate({ type: "string", minLength: 1 }, "");
  assert.ok(errs.some((e) => /minLength/.test(e)), errs.join("\n"));
});

test("validate minLength/maxLength count Unicode code points (astral plane)", () => {
  // 😀 is one code point, two UTF-16 code units. Draft 2020-12 uses code points.
  assert.equal([..."😀"].length, 1);
  assert.equal("😀".length, 2);
  const errs = validate({ type: "string", minLength: 2, maxLength: 1 }, "😀");
  assert.ok(errs.some((e) => /minLength/.test(e)), `expected minLength, got: ${errs.join("\n")}`);
  assert.ok(!errs.some((e) => /maxLength/.test(e)), `must not fire maxLength for 1 code point: ${errs.join("\n")}`);
  assert.deepEqual(validate({ type: "string", minLength: 1, maxLength: 1 }, "😀"), []);
});

test("validate enforces uniqueItems (fire and pass)", () => {
  assert.deepEqual(validate({ type: "array", uniqueItems: true }, ["a", "b"]), []);
  const errs = validate({ type: "array", uniqueItems: true }, ["a", "a"]);
  assert.ok(errs.some((e) => /uniqueItems|duplicate/.test(e)), errs.join("\n"));
});

test("validate uniqueItems treats JSON-equal objects equal despite key order", () => {
  const errs = validate(
    { type: "array", uniqueItems: true },
    [{ outer: { a: 1, b: [2, 3] } }, { outer: { b: [2, 3], a: 1 } }]
  );
  assert.ok(errs.some((e) => /uniqueItems|duplicate/.test(e)), errs.join("\n"));
});

test("validate uniqueItems keeps __proto__ keys and array/object shapes distinct", () => {
  const protoPair = JSON.parse('[{"__proto__":{"x":1}},{}]');
  assert.deepEqual(validate({ type: "array", uniqueItems: true }, protoPair), []);
  const shapePair = [{ a: 1 }, [["a", 1]]];
  assert.deepEqual(validate({ type: "array", uniqueItems: true }, shapePair), []);
});

test("live schemas exercise maxLength, minLength, uniqueItems", () => {
  const genreSchema = JSON.parse(fs.readFileSync(rel("schemas/genre-index-row.schema.json"), "utf8"));
  const row = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-genre-index-row.json"), "utf8"));
  assert.deepEqual(validate(genreSchema, row), [], "minimal genre-index-row fixture must pass");
  const longMoat = structuredClone(row);
  longMoat.moat = "x".repeat(121);
  assert.ok(validate(genreSchema, longMoat).some((e) => /maxLength/.test(e)));
  const dups = structuredClone(row);
  dups.design_shape.loop_class.secondary = ["discovery", "discovery"];
  assert.ok(validate(genreSchema, dups).some((e) => /uniqueItems|duplicate/.test(e)));

  const specSchema = JSON.parse(fs.readFileSync(rel("schemas/spec-decomposition.schema.json"), "utf8"));
  const spec = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-spec-decomposition.json"), "utf8"));
  assert.deepEqual(validate(specSchema, spec), []);
  // minLength is on asset_requests[].derive.recipe / base.pack_id / base.name
  const emptyRecipe = structuredClone(spec);
  emptyRecipe.asset_requests = [{
    request_id: "r1",
    role: "hero",
    kind: "sprite",
    constraints: {},
    substitution_policy: "none",
    derive: { base: { pack_id: "p", name: "n" }, recipe: "" }
  }];
  assert.ok(validate(specSchema, emptyRecipe).some((e) => /minLength/.test(e)));

  const cardSchema = JSON.parse(fs.readFileSync(rel("schemas/reference-card.schema.json"), "utf8"));
  const card = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-reference-card.json"), "utf8"));
  assert.deepEqual(validate(cardSchema, card), [], "minimal reference-card fixture must pass");
});

test("spec-decomposition schema: playable_baseline optional for legacy runs but shape-locked", () => {
  const specSchema = JSON.parse(fs.readFileSync(rel("schemas/spec-decomposition.schema.json"), "utf8"));
  const spec = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-spec-decomposition.json"), "utf8"));
  assert.deepEqual(validate(specSchema, spec), [], "fixture's playable_baseline must pass");

  // Legacy tolerance (ADR 0013): recorded runs without the block still validate —
  // the baseline is required at package/export time by the mapper, not the schema.
  const legacy = structuredClone(spec);
  delete legacy.playable_baseline;
  assert.deepEqual(validate(specSchema, legacy), []);

  const extraKey = structuredClone(spec);
  extraKey.playable_baseline.boot.mode = "debug";
  assert.ok(validate(specSchema, extraKey).length > 0, "additionalProperties must fire");

  const thinStates = structuredClone(spec);
  thinStates.playable_baseline.outcome.states = ["only-one"];
  assert.ok(validate(specSchema, thinStates).length > 0, "outcome.states minItems 2 must fire");

  const noActions = structuredClone(spec);
  noActions.playable_baseline.controls.actions = [];
  assert.ok(validate(specSchema, noActions).length > 0, "controls.actions minItems 1 must fire");
});


function node(script, args, opts = {}) {
  return spawnSync(process.execPath, [rel("scripts", script), ...args], { encoding: "utf8", ...opts });
}
function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tgf-t05-"));
}

function markRunLegacy(dir, id) {
  const runDir = path.join(dir, ".tgf", "seeds", id);
  const manifestFile = path.join(runDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  manifest.factory_version = "0.1.0";
  manifest.current_phase = "toolchain";
  manifest.resume_point.phase = "toolchain";
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  const ledgerFile = path.join(runDir, "execution-ledger.jsonl");
  const rows = fs.readFileSync(ledgerFile, "utf8").trim().split("\n").map(JSON.parse);
  rows[0].phase = "toolchain";
  rows[0].resume_point.phase = "toolchain";
  fs.writeFileSync(ledgerFile, rows.map(JSON.stringify).join("\n") + "\n");
}

const thesisSchema = () => JSON.parse(fs.readFileSync(rel("schemas/game-thesis.schema.json"), "utf8"));
const specSchema = () => JSON.parse(fs.readFileSync(rel("schemas/spec-decomposition.schema.json"), "utf8"));
const minimalThesis = () => JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8"));
const minimalSpec = () => JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-spec-decomposition.json"), "utf8"));

const ADVANCE_DV = {
  scores: {
    meaningful_choice: 2, tradeoff: 2, pressure: 2, uncertainty: 2, progression: 2,
    mastery: 2, combinatorial: 2, emergence: 2, replayable_variation: 2,
    failure_recovery: 0, expression: 0, expansion_headroom: 0
  },
  total: 18, verdict: "ADVANCE"
};

const ACCEPTANCE_KINDS = ["mechanical", "visual", "feel_budget", "animation_cycle", "performance"];

// --- AC1: feel_targets item shape ---
test("AC1: feel_targets items require id, statement, metric, budget (number), unit", () => {
  const schema = thesisSchema();
  const good = minimalThesis();
  assert.deepEqual(validate(schema, good), [], "minimal fixture must pass");
  const ft = good.feel_targets[0];
  for (const key of ["id", "statement", "metric", "budget", "unit"]) {
    assert.ok(key in ft, `fixture feel_target missing ${key}`);
  }
  assert.equal(typeof ft.budget, "number");

  const missingBudget = structuredClone(good);
  delete missingBudget.feel_targets[0].budget;
  assert.ok(validate(schema, missingBudget).some((e) => /budget/.test(e)));

  const stringBudget = structuredClone(good);
  stringBudget.feel_targets[0].budget = "120";
  assert.ok(validate(schema, stringBudget).some((e) => /budget|type/.test(e)));

  const freeString = structuredClone(good);
  freeString.feel_targets = ["responsive controls"];
  assert.ok(validate(schema, freeString).some((e) => /feel_targets\[0\]/.test(e) && /object|type/.test(e)));
});

// --- AC2: gate checker blocks ADVANCE without feel_targets ---
test("AC2: design-lock ADVANCE fails without feel_targets and names the rule", () => {
  const dir = tmp();
  const id = "selftest-no-feel-advance";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    markRunLegacy(dir, id);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const thesis = structuredClone(minimalThesis());
    thesis.feel_targets = [];
    fs.writeFileSync(runDir + "/GAME_THESIS.md", "# GAME_THESIS.md\n\n```json\n" + JSON.stringify(thesis, null, 2) + "\n```\n");
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"),
      "# ADR\n\n```json\n" + JSON.stringify({
        seed_id: id, status: "accepted", decision: "x", profile: "p",
        rationale: "r", rejected: [], reversal_triggers: ["t"]
      }) + "\n```\n");
    // advance to engine-profile (past design-review) so design-lock check applies
    const m = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
    m.current_phase = "engine-profile";
    m.game_thesis_path = `.tgf/seeds/${id}/GAME_THESIS.md`;
    m.engine_decision_path = `.tgf/seeds/${id}/decisions/0001-engine-profile.md`;
    fs.writeFileSync(path.join(runDir, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
    const ledger = path.join(runDir, "execution-ledger.jsonl");
    for (const phase of ["thesis", "design-review", "engine-profile"]) {
      fs.appendFileSync(ledger, JSON.stringify({
        ts: "2026-06-07T00:00:00.000Z", seed_id: id, phase, event: "phase-advance",
        status: "checkpointed", actor: "test"
      }) + "\n");
    }
    fs.mkdirSync(path.join(runDir, "reviews", "design"), { recursive: true });
    fs.writeFileSync(path.join(runDir, "reviews", "design", "depth-vector.json"), JSON.stringify(ADVANCE_DV));

    const r = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(FEEL_TARGET_REQUIRED_FOR_ADVANCE));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- AC3: acceptance item shape ---
test("AC3: acceptance items require kind enum + statement + check", () => {
  const schema = specSchema();
  const good = minimalSpec();
  assert.deepEqual(validate(schema, good), [], "minimal fixture must pass");
  const ac = good.slices[0].acceptance[0];
  for (const key of ["kind", "statement", "check"]) {
    assert.ok(key in ac, `fixture acceptance missing ${key}`);
  }
  assert.ok(ACCEPTANCE_KINDS.includes(ac.kind));

  const freeString = structuredClone(good);
  freeString.slices[0].acceptance = ["bot completes the loop"];
  assert.ok(validate(schema, freeString).some((e) => /acceptance\[0\]/.test(e)));

  const badKind = structuredClone(good);
  badKind.slices[0].acceptance[0].kind = "juice";
  assert.ok(validate(schema, badKind).some((e) => /kind|enum/.test(e)));

  for (const kind of ACCEPTANCE_KINDS) {
    const clone = structuredClone(good);
    clone.slices[0].acceptance[0].kind = kind;
    assert.deepEqual(validate(schema, clone), [], `kind ${kind} must be accepted`);
  }

  const missingCheck = structuredClone(good);
  delete missingCheck.slices[0].acceptance[0].check;
  assert.ok(validate(schema, missingCheck).some((e) => /check/.test(e)));
});

// --- AC4: prompts/templates instruct structured form with worked examples ---
test("AC4: authoring prompts and thesis template include structured worked examples", () => {
  const p01 = fs.readFileSync(rel(".factory/prompts/P01_SEED_COMPILE.md"), "utf8");
  assert.match(p01, /"id":\s*"rotate-snap"/);
  assert.match(p01, /"budget":\s*120/);
  assert.match(p01, /feel-target-required-for-ADVANCE/);

  const p18 = fs.readFileSync(rel(".factory/prompts/P18_DECOMPOSE_SPEC.md"), "utf8");
  assert.match(p18, /"kind":\s*"feel_budget"/);
  assert.match(p18, /mechanical \| visual \| feel_budget \| animation_cycle \| performance/);
  assert.match(p18, /"check":\s*"feel:rotate-snap"/);

  const tpl = fs.readFileSync(rel("templates/run/GAME_THESIS.template.md"), "utf8");
  assert.match(tpl, /"feel_targets"/);
  assert.match(tpl, /"budget":\s*120/);
  assert.match(tpl, /"unit":\s*"ms"/);
});

// --- AC6: end-to-end fixture-scale seed produces schema-valid thesis + decomposition ---
test("AC6: fixture-scale run validates structured thesis + decomposition end-to-end", () => {
  const dir = tmp();
  const id = "selftest-t05-e2e";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "tiny asteroid gardening"], { cwd: dir }).status, 0);
    markRunLegacy(dir, id);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const thesis = structuredClone(minimalThesis());
    const spec = structuredClone(minimalSpec());
    spec.seed_id = id;
    fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"),
      "# GAME_THESIS.md\n\n```json\n" + JSON.stringify(thesis, null, 2) + "\n```\n");
    fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"),
      "# ADR\n\n```json\n" + JSON.stringify({
        seed_id: id, status: "accepted", decision: "x", profile: "p",
        rationale: "r", rejected: [], reversal_triggers: ["t"]
      }) + "\n```\n");
    fs.writeFileSync(path.join(runDir, "SPEC.md"),
      "# SPEC.md\n\n```json\n" + JSON.stringify(spec, null, 2) + "\n```\n");
    fs.mkdirSync(path.join(runDir, "reviews", "design"), { recursive: true });
    fs.writeFileSync(path.join(runDir, "reviews", "design", "depth-vector.json"), JSON.stringify(ADVANCE_DV));

    const m = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
    m.current_phase = "decompose";
    m.game_thesis_path = `.tgf/seeds/${id}/GAME_THESIS.md`;
    m.engine_decision_path = `.tgf/seeds/${id}/decisions/0001-engine-profile.md`;
    m.spec_path = `.tgf/seeds/${id}/SPEC.md`;
    fs.writeFileSync(path.join(runDir, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
    const ledger = path.join(runDir, "execution-ledger.jsonl");
    for (const phase of ["thesis", "design-review", "engine-profile", "decompose"]) {
      fs.appendFileSync(ledger, JSON.stringify({
        ts: "2026-06-07T00:00:00.000Z", seed_id: id, phase, event: "phase-advance",
        status: "checkpointed", actor: "test"
      }) + "\n");
    }

    const runChk = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(runChk.status, 0, runChk.stdout + runChk.stderr);

    const thesisChk = node("validate-artifacts.mjs", ["--check", "thesis", "--seed-id", id], { cwd: dir });
    assert.equal(thesisChk.status, 0, thesisChk.stdout + thesisChk.stderr);

    const specChk = node("validate-artifacts.mjs", ["--check", "spec", "--seed-id", id], { cwd: dir });
    assert.equal(specChk.status, 0, specChk.stdout + specChk.stderr);

    const emit = node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir });
    assert.equal(emit.status, 0, emit.stderr);
    const issue = fs.readFileSync(path.join(runDir, "issues", "tracer-loop.md"), "utf8");
    assert.match(issue, /kind: feel_budget/);
    assert.match(issue, /check: feel:rotate-snap/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- AC7: pre-refresh free-string artifacts fail with re-run pointer ---
test("AC7: pre-refresh free-string thesis fails with re-run-phase pointer", () => {
  const dir = tmp();
  try {
    const f = path.join(dir, "GAME_THESIS.md");
    const old = structuredClone(minimalThesis());
    old.feel_targets = ["responsive", "weighty"];
    fs.writeFileSync(f, "# GAME_THESIS.md\n\n```json\n" + JSON.stringify(old, null, 2) + "\n```\n");
    const { obj, errors } = readEmbeddedArtifact(f, "game-thesis");
    assert.equal(obj, null);
    assert.ok(errors.some((e) => /expected type object/.test(e) || /feel_targets/.test(e)));
    assert.ok(errors.some((e) => /re-run the thesis phase \(P01\)/.test(e) && /no migration shim/.test(e)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("AC7: pre-refresh free-string acceptance fails with re-run-phase pointer", () => {
  const dir = tmp();
  try {
    const f = path.join(dir, "SPEC.md");
    const old = structuredClone(minimalSpec());
    old.slices[0].acceptance = ["bot completes the loop"];
    fs.writeFileSync(f, "# SPEC.md\n\n```json\n" + JSON.stringify(old, null, 2) + "\n```\n");
    const { obj, errors } = readEmbeddedArtifact(f, "spec-decomposition");
    assert.equal(obj, null);
    assert.ok(errors.some((e) => /acceptance/.test(e) || /expected type object/.test(e)));
    assert.ok(errors.some((e) => /re-run the decompose phase \(P18\)/.test(e) && /no migration shim/.test(e)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
