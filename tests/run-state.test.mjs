import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as rs from "../scripts/lib/run-state.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(REPO, ...p);
function node(script, args, opts = {}) {
  return spawnSync(process.execPath, [rel("scripts", script), ...args], { encoding: "utf8", ...opts });
}
function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tgf-rs-"));
}

test("isValidSeedId accepts kebab ids and rejects junk", () => {
  assert.ok(rs.isValidSeedId("tiny-asteroid-gardening"));
  assert.ok(rs.isValidSeedId("a1"));
  assert.ok(!rs.isValidSeedId("Bad_ID"));
  assert.ok(!rs.isValidSeedId("-leading"));
  assert.ok(!rs.isValidSeedId("trailing-"));
  assert.ok(!rs.isValidSeedId("a"));
});

test("ALL_PHASES matches the seed-manifest current_phase enum", () => {
  const schema = JSON.parse(fs.readFileSync(rel("schemas/seed-manifest.schema.json"), "utf8"));
  const enumPhases = schema.properties.current_phase.enum;
  assert.deepEqual([...rs.ALL_PHASES].sort(), [...enumPhases].sort());
});

test("phase machine: legal spine transitions pass, illegal jumps fail", () => {
  assert.ok(rs.isLegalTransition("toolchain", "thesis"));
  assert.ok(rs.isLegalTransition("depth-review", "deepen"));
  assert.ok(rs.isLegalTransition("depth-review", "fun-lock")); // solo path, no bakeoff
  assert.ok(rs.isLegalTransition("deepen", "first-slice")); // re-test
  assert.ok(rs.isLegalTransition("first-slice", "first-slice")); // re-entrant checkpoint
  assert.ok(rs.isLegalTransition("first-slice", "blocked")); // any active phase may block
  assert.ok(rs.isLegalTransition("blocked", "first-slice")); // resume from blocked

  assert.ok(!rs.isLegalTransition("thesis", "art")); // skips the whole middle
  assert.ok(!rs.isLegalTransition("toolchain", "fun-lock"));
  assert.ok(!rs.isLegalTransition("killed", "first-slice")); // terminal is absorbing
  assert.ok(!rs.isLegalTransition("complete", "handoff"));
});

test("ledgerTransitionErrors flags the first illegal hop only where it occurs", () => {
  const legal = [
    { phase: "toolchain" }, { phase: "toolchain" }, { phase: "thesis" }, { phase: "engine-profile" }
  ];
  assert.deepEqual(rs.ledgerTransitionErrors(legal), []);

  const illegal = [{ phase: "toolchain" }, { phase: "thesis" }, { phase: "art" }];
  const errs = rs.ledgerTransitionErrors(illegal);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /thesis -> art/);
});

test("phaseArtifactConstraintErrors enforces thesis/engine paths strictly after their phase", () => {
  // toolchain: nothing required
  assert.deepEqual(rs.phaseArtifactConstraintErrors({ current_phase: "toolchain", game_thesis_path: null, engine_decision_path: null }), []);
  // thesis: still producing the thesis, not yet required
  assert.deepEqual(rs.phaseArtifactConstraintErrors({ current_phase: "thesis", game_thesis_path: null, engine_decision_path: null }), []);
  // engine-profile: past thesis -> thesis required; engine still being produced -> not required
  const ep = rs.phaseArtifactConstraintErrors({ current_phase: "engine-profile", game_thesis_path: null, engine_decision_path: null });
  assert.equal(ep.length, 1);
  assert.match(ep[0], /game_thesis_path/);
  // prototype-dispatch: past engine-profile -> both required
  const pd = rs.phaseArtifactConstraintErrors({ current_phase: "prototype-dispatch", game_thesis_path: "t.md", engine_decision_path: null });
  assert.equal(pd.length, 1);
  assert.match(pd[0], /engine_decision_path/);
  // fully populated downstream phase passes
  assert.deepEqual(rs.phaseArtifactConstraintErrors({ current_phase: "first-slice", game_thesis_path: "t.md", engine_decision_path: "d.md" }), []);
  // a killed run is off-spine and exempt even with null artifacts
  assert.deepEqual(rs.phaseArtifactConstraintErrors({ current_phase: "killed", game_thesis_path: null, engine_decision_path: null }), []);
});

test("manifestPathPolicyErrors keeps run artifact paths inside the seed run", () => {
  const dir = tmp();
  const id = "rs-path-policy";
  const manifest = {
    seed_id: id,
    seed_path: `.tgf/seeds/${id}/GAME_SEED.md`,
    game_thesis_path: `.tgf/seeds/${id}/GAME_THESIS.md`,
    engine_decision_path: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
    default_child_game_root: rs.childGameRootFor(id),
    child_game_path: null,
    execution_ledger_path: `.tgf/seeds/${id}/execution-ledger.jsonl`,
    playtest_report_paths: [`.tgf/seeds/${id}/playtests/smoke/playtest_report.json`],
    review_report_paths: [`.tgf/seeds/${id}/reviews/smoke/depth-vector.json`],
    handoff_paths: [`.tgf/seeds/${id}/handoffs/handoff.md`],
    resume_point: { artifact_path: `.tgf/seeds/${id}/README_AGENT_BOOT.md` }
  };
  try {
    const runDir = rs.runDirFor(dir, id);
    fs.mkdirSync(runDir, { recursive: true });
    assert.deepEqual(rs.manifestPathPolicyErrors(manifest, id, dir), []);
    const traversal = rs.manifestPathPolicyErrors({ ...manifest, game_thesis_path: `.tgf/seeds/${id}/../other/GAME_THESIS.md` }, id, dir);
    assert.match(traversal.join("\n"), /game_thesis_path must resolve inside/);
    const absolute = rs.manifestPathPolicyErrors({ ...manifest, engine_decision_path: "/tmp/engine.md" }, id, dir);
    assert.match(absolute.join("\n"), /engine_decision_path must resolve inside/);
    const child = rs.manifestPathPolicyErrors({ ...manifest, child_game_path: "/tmp/not-the-child-game" }, id, dir);
    assert.match(child.join("\n"), /child_game_path must resolve inside/);
    const outside = tmp();
    fs.symlinkSync(outside, path.join(runDir, "linked"));
    const linked = rs.manifestPathPolicyErrors({ ...manifest, game_thesis_path: `.tgf/seeds/${id}/linked/GAME_THESIS.md` }, id, dir);
    assert.match(linked.join("\n"), /game_thesis_path must not traverse symlink/);
    const linkedReports = rs.manifestPathPolicyErrors({
      ...manifest,
      playtest_report_paths: [`.tgf/seeds/${id}/linked/playtest_report.json`],
      review_report_paths: [`.tgf/seeds/${id}/linked/depth-vector.json`],
      handoff_paths: [`.tgf/seeds/${id}/linked/handoff.md`]
    }, id, dir);
    assert.match(linkedReports.join("\n"), /playtest_report_paths\[0\] must not traverse symlink/);
    assert.match(linkedReports.join("\n"), /review_report_paths\[0\] must not traverse symlink/);
    assert.match(linkedReports.join("\n"), /handoff_paths\[0\] must not traverse symlink/);
    fs.rmSync(outside, { recursive: true, force: true });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("questionBudgetErrors enforces <=1 direction-changing question before first-slice", () => {
  const q = (n) => Array.from({ length: n }, (_, i) => ({ question: `q${i}`, recommended_default: "d", phase_asked: "thesis" }));
  assert.deepEqual(rs.questionBudgetErrors({ current_phase: "thesis", questions_asked: q(1) }), []);
  assert.ok(rs.questionBudgetErrors({ current_phase: "thesis", questions_asked: q(2) }).length > 0);
  assert.deepEqual(rs.questionBudgetErrors({ current_phase: "toolchain", questions_asked: q(5) }), []); // not yet gated
  assert.deepEqual(rs.questionBudgetErrors({ current_phase: "first-slice" }), []); // no field -> 0
});

test("deepenAttemptErrors enforces the 2-attempt deepen cap", () => {
  assert.deepEqual(rs.deepenAttemptErrors({ current_phase: "deepen", deepen_attempt_count: 2 }), []);
  assert.ok(rs.deepenAttemptErrors({ current_phase: "deepen", deepen_attempt_count: 3 }).length > 0);
  assert.deepEqual(rs.deepenAttemptErrors({ current_phase: "killed", deepen_attempt_count: 3 }), []);
});

test("readLedger is crash-safe: a malformed line is skipped and reported", () => {
  const dir = tmp();
  try {
    const runDir = rs.runDirFor(dir, "x");
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, "execution-ledger.jsonl"),
      `${JSON.stringify({ phase: "toolchain", event: "a" })}\n{ this is not json\n${JSON.stringify({ phase: "toolchain", event: "b" })}\n`);
    const { rows, parseErrors } = rs.readLedger(runDir);
    assert.equal(rows.length, 2);
    assert.equal(parseErrors.length, 1);
    assert.match(parseErrors[0], /line 2/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("summarize-run prints an evidence-first summary for a created run", () => {
  const dir = tmp();
  const id = "rs-summary";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const r = node("summarize-run.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /# Seed run: rs-summary/);
    assert.match(r.stdout, /phase:\s+toolchain/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("summarize-run rejects invalid seed-id before path derivation", () => {
  const dir = tmp();
  try {
    const r = node("summarize-run.mjs", ["--seed-id", "../escape"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /invalid --seed-id/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("summarize-run rejects a symlinked seed run root before reading content", () => {
  const dir = tmp();
  const outside = tmp();
  const id = "rs-summary-symlink";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "outside content"], { cwd: outside }).status, 0);
    fs.mkdirSync(path.join(dir, ".tgf", "seeds"), { recursive: true });
    fs.symlinkSync(path.join(outside, ".tgf", "seeds", id), path.join(dir, ".tgf", "seeds", id));
    const r = node("summarize-run.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /path must not traverse symlink/);
    assert.doesNotMatch(r.stdout, /outside content/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("summarize-run rejects ledger parse or seed-id errors before output", () => {
  const dir = tmp();
  const id = "rs-summary-bad-ledger";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const ledgerPath = path.join(runDir, "execution-ledger.jsonl");
    const first = JSON.parse(fs.readFileSync(ledgerPath, "utf8").trim().split("\n")[0]);
    fs.writeFileSync(ledgerPath, JSON.stringify(first) + "\n" + JSON.stringify({ ...first, seed_id: "other-seed", event: "tampered" }) + "\n");
    let r = node("summarize-run.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /execution-ledger\.jsonl.*invalid/);
    assert.match(r.stderr, /seed_id 'other-seed' does not match/);
    assert.doesNotMatch(r.stdout, /# Seed run/);

    fs.writeFileSync(ledgerPath, JSON.stringify(first) + "\n" + "{ bad json\n");
    r = node("summarize-run.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /not valid JSON/);
    assert.doesNotMatch(r.stdout, /# Seed run/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("extractFencedJson pulls the first json block and reports a missing/broken one", () => {
  assert.deepEqual(rs.extractFencedJson("pre\n```json\n{\"a\":1}\n```\npost").obj, { a: 1 });
  assert.match(rs.extractFencedJson("no block here").error, /no fenced/);
  assert.match(rs.extractFencedJson("```json\n{bad}\n```").error, /not parseable/);
});

test("validateEmbeddedJson checks a markdown artifact's json block against a schema", () => {
  const dir = tmp();
  try {
    const obj = fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8");
    const md = path.join(dir, "GAME_THESIS.md");
    fs.writeFileSync(md, "# t\n\n```json\n" + obj + "\n```\n");
    assert.deepEqual(rs.validateEmbeddedJson(md, "game-thesis"), []);
    const broken = JSON.parse(obj); delete broken.pitch;
    fs.writeFileSync(md, "# t\n\n```json\n" + JSON.stringify(broken) + "\n```\n");
    assert.ok(rs.validateEmbeddedJson(md, "game-thesis").length > 0, "missing required field must fail");
    fs.writeFileSync(md, "# t\n\nno json block at all\n");
    assert.match(rs.validateEmbeddedJson(md, "game-thesis")[0], /no fenced/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
