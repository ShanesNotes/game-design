import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_AT = "2026-07-12T12:00:00.000Z";
const AXES = [
  "meaningful_choice", "tradeoff", "pressure", "uncertainty", "progression", "mastery",
  "combinatorial", "emergence", "replayable_variation", "failure_recovery", "expression", "expansion_headroom"
];
const SCORES = {
  meaningful_choice: 2, tradeoff: 2, pressure: 2, uncertainty: 1, progression: 1, mastery: 2,
  combinatorial: 1, emergence: 1, replayable_variation: 2, failure_recovery: 1, expression: 1,
  expansion_headroom: 1
};

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-validation-"));
}

function run(script, args, cwd) {
  return spawnSync(process.execPath, [path.join(REPO, "scripts", script), ...args], { cwd, encoding: "utf8" });
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function writeEmbedded(file, heading, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `# ${heading}\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`);
}

function appendPhase(runDir, id, phase) {
  const manifestFile = path.join(runDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  manifest.current_phase = phase;
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  fs.appendFileSync(path.join(runDir, "execution-ledger.jsonl"), JSON.stringify({
    ts: GENERATED_AT, seed_id: id, phase, event: "test-advance", status: "checkpointed", actor: "test"
  }) + "\n");
}

function digest(id, withPrior = false) {
  return {
    schema_version: "1.0.0",
    seed_id: id,
    generated_at: GENERATED_AT,
    sources: [
      { source: "design-runs", status: "read" },
      { source: "games-index", status: "skipped", reason: "fixture" }
    ],
    prior_theses: withPrior ? [{
      seed_id: "prior-one",
      pitch: "prior",
      chosen_loop: { id: "loop-a", verbs: "plant, water, rotate" },
      design_register: "mechanics-first",
      golden_moment: "prior moment",
      depth_vector: { verdict: "ADVANCE", scores: SCORES }
    }] : [],
    games: [],
    skipped: [{ source: "games-index", reason: "fixture" }]
  };
}

function intake(id) {
  return {
    schema_version: "1.0.0",
    seed_id: id,
    portfolio_digest_ref: `.tgf/seeds/${id}/intake/portfolio-digest.json`,
    demand_reality: "retry to master timing",
    status_quo: "timing puzzle",
    desperate_specificity: "one-screen garden",
    narrow_playable_wedge: "sixty-second loop",
    observation_evidence: "action spread",
    premise_challenge: "rotation may dominate",
    alternatives: "relocation loop",
    future_fit: "new asteroid rules after fun-lock",
    store_positioning: "timing garden",
    reviewer_concern: "derivative resource skin"
  };
}

function thesis(id, nearest = "prior-one") {
  const value = JSON.parse(fs.readFileSync(path.join(REPO, "examples/fixtures/minimal-game-thesis.json"), "utf8"));
  return {
    ...value,
    schema_version: "2.0.0",
    portfolio_distinctness: {
      nearest_prior_seed: nearest,
      falsifying_difference: "Water now changes the pot topology before rotation can preserve light.",
      digest_generated_at: GENERATED_AT
    }
  };
}

function prepareIntake(dir, id, withPrior = false) {
  assert.equal(run("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], dir).status, 0);
  const runDir = path.join(dir, ".tgf", "seeds", id);
  writeJson(path.join(runDir, "intake/portfolio-digest.json"), digest(id, withPrior));
  writeEmbedded(path.join(runDir, "intake/office-hours.md"), "Office Hours", intake(id));
  return runDir;
}

test("new runs cannot reach toolchain without schema-valid intake evidence", () => {
  const dir = tmp();
  const id = "intake-gate";
  try {
    assert.equal(run("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], dir).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    appendPhase(runDir, id, "toolchain");
    let result = run("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /intake\/office-hours\.md/);
    writeJson(path.join(runDir, "intake/portfolio-digest.json"), digest(id));
    writeEmbedded(path.join(runDir, "intake/office-hours.md"), "Office Hours", intake(id));
    result = run("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], dir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("new theses require a digest-backed nearest-prior disposition", () => {
  const dir = tmp();
  const id = "thesis-distinctness";
  try {
    const runDir = prepareIntake(dir, id, true);
    appendPhase(runDir, id, "toolchain");
    appendPhase(runDir, id, "thesis");
    const thesisPath = `.tgf/seeds/${id}/GAME_THESIS.md`;
    const manifestFile = path.join(runDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    manifest.game_thesis_path = thesisPath;
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
    writeEmbedded(path.join(runDir, "GAME_THESIS.md"), "Game Thesis", thesis(id, "not-in-digest"));
    let result = run("validate-artifacts.mjs", ["--check", "thesis", "--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /nearest_prior_seed.*not present/i);
    writeEmbedded(path.join(runDir, "GAME_THESIS.md"), "Game Thesis", thesis(id));
    result = run("validate-artifacts.mjs", ["--check", "thesis", "--seed-id", id], dir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("new depth vectors require cited thesis paths, provenance, and exact-match disposition", () => {
  const dir = tmp();
  const id = "depth-teeth";
  try {
    const runDir = prepareIntake(dir, id, true);
    appendPhase(runDir, id, "toolchain");
    appendPhase(runDir, id, "thesis");
    const manifestFile = path.join(runDir, "manifest.json");
    let manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    manifest.game_thesis_path = `.tgf/seeds/${id}/GAME_THESIS.md`;
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
    writeEmbedded(path.join(runDir, "GAME_THESIS.md"), "Game Thesis", thesis(id));
    appendPhase(runDir, id, "design-review");
    const vectorPath = path.join(runDir, "reviews/depth-vector.json");
    writeJson(vectorPath, { schema_version: "2.0.0", scores: SCORES, total: 17, register: "mechanics-first", verdict: "ADVANCE" });
    let result = run("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /per-axis evidence|review_provenance/i);

    const evidence = Object.fromEntries(AXES.map((axis) => [axis, "core_loop_candidates[0].verbs"]));
    evidence.expression = "not.a.thesis.path";
    writeJson(vectorPath, {
      schema_version: "2.0.0", scores: SCORES, total: 17, register: "mechanics-first",
      evidence, review_provenance: { mode: "independent", reviewer_note: "cold review" }, verdict: "ADVANCE"
    });
    result = run("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /not\.a\.thesis\.path/);

    evidence.expression = "core_loop_candidates[0].verbs";
    writeJson(vectorPath, {
      schema_version: "2.0.0", scores: SCORES, total: 17, register: "mechanics-first",
      evidence, review_provenance: { mode: "independent", reviewer_note: "cold review" }, verdict: "ADVANCE"
    });
    result = run("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /exactly matches prior ADVANCE.*prior-one/i);

    fs.writeFileSync(path.join(runDir, "reviews/ANTI_BORING_VERDICT.md"), "Distinctness disposition: prior-one differs because water rewrites topology.\n");
    result = run("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], dir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    appendPhase(runDir, id, "engine-profile");
    result = run("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], dir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
