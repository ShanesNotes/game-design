import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  depthVectorConsistencyErrors, playtestConsistencyErrors
} from "../scripts/lib/anti-boring-gate.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(REPO, ...p);

const goodDV = {
  scores: {
    meaningful_choice: 2, tradeoff: 2, pressure: 2, uncertainty: 1, progression: 1,
    mastery: 2, combinatorial: 1, emergence: 1, replayable_variation: 2,
    failure_recovery: 1, expression: 1, expansion_headroom: 1
  },
  total: 17, verdict: "ADVANCE"
};

test("depth-vector: a consistent ADVANCE passes", () => {
  assert.deepEqual(depthVectorConsistencyErrors(goodDV), []);
});

test("depth-vector: total must equal the sum of axes", () => {
  const errs = depthVectorConsistencyErrors({ ...goodDV, total: 99 });
  assert.ok(errs.some((e) => /total 99 != sum/.test(e)));
});

test("depth-vector: ADVANCE below the 16 floor is self-contradicting", () => {
  const scores = { ...goodDV.scores, mastery: 0, replayable_variation: 0, expansion_headroom: 0, expression: 0 };
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const errs = depthVectorConsistencyErrors({ scores, total, verdict: "ADVANCE" });
  assert.ok(errs.some((e) => /< 16/.test(e)));
  assert.ok(errs.some((e) => /required axis 'mastery' is 0/.test(e)));
});

test("depth-vector: DEEPEN/KILL carry no numeric floor", () => {
  const scores = { ...goodDV.scores };
  for (const k of Object.keys(scores)) scores[k] = 0;
  assert.deepEqual(depthVectorConsistencyErrors({ scores, total: 0, verdict: "KILL" }), []);
});

test("playtest: dominant_move boolean must agree with action_distribution", () => {
  const dominated = { anti_boring: { dominant_move: false }, action_distribution: { a: 90, b: 5, c: 5 } };
  assert.ok(playtestConsistencyErrors(dominated).some((e) => /dominant_move=false/.test(e)));
  const balanced = { anti_boring: { dominant_move: false }, action_distribution: { a: 18, b: 21, c: 9 } };
  assert.deepEqual(playtestConsistencyErrors(balanced), []);
});

test("validate-artifacts --check gate passes for the consistent fixtures", () => {
  const r = spawnSync(process.execPath, [rel("scripts/validate-artifacts.mjs"), "--check", "gate"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("validate-artifacts --check gate --file flags a corrupt artifact", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tgf-gate-"));
  try {
    const f = path.join(dir, "bad-depth.json");
    fs.writeFileSync(f, JSON.stringify({ ...goodDV, total: 3 }));
    const r = spawnSync(process.execPath, [rel("scripts/validate-artifacts.mjs"), "--check", "gate", "--file", f], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /!= sum/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
