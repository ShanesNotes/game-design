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
