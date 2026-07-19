import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openPortfolio, portfolioForDigest } from "../scripts/lib/portfolio-memory.mjs";
import { validate } from "../scripts/lib/validate-json-schema.mjs";

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
  return spawnSync(process.execPath, [path.join(REPO, "scripts", script), ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, STUDIO_ROOT: cwd, GAME_DESIGN_ROOT: cwd }
  });
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
  if (withPrior) {
    writeEmbedded(path.join(dir, ".tgf/seeds/prior-one/GAME_THESIS.md"), "Prior Thesis", { pitch: "prior" });
    writeJson(path.join(dir, ".tgf/seeds/prior-one/reviews/depth-vector.json"), {
      scores: SCORES,
      total: 17,
      verdict: "ADVANCE"
    });
  }
  const built = run("build-portfolio-digest.mjs", ["--seed-id", id], dir);
  assert.equal(built.status, 0, built.stdout + built.stderr);
  const digestPath = path.join(runDir, "intake/portfolio-digest.json");
  const builtDigest = JSON.parse(fs.readFileSync(digestPath, "utf8"));
  builtDigest.generated_at = GENERATED_AT;
  writeJson(digestPath, builtDigest);
  writeEmbedded(path.join(runDir, "intake/office-hours.md"), "Office Hours", intake(id));
  return runDir;
}

test("v2 thesis and vector schemas conditionally require portfolio fields", () => {
  const thesisSchema = JSON.parse(fs.readFileSync(path.join(REPO, "schemas/game-thesis.schema.json"), "utf8"));
  const vectorSchema = JSON.parse(fs.readFileSync(path.join(REPO, "schemas/depth-vector.schema.json"), "utf8"));
  const badThesis = thesis("schema-conditional");
  delete badThesis.portfolio_distinctness;
  assert.ok(validate(thesisSchema, badThesis).some((error) => /portfolio_distinctness/.test(error)));
  const badVector = { schema_version: "2.0.0", scores: SCORES, total: 17, verdict: "ADVANCE" };
  const vectorErrors = validate(vectorSchema, badVector);
  assert.ok(vectorErrors.some((error) => /evidence/.test(error)));
  assert.ok(vectorErrors.some((error) => /review_provenance/.test(error)));
  const arrayEvidence = {
    ...badVector,
    evidence: [],
    review_provenance: { mode: "same-context", reviewer_note: "fixture" }
  };
  assert.ok(validate(vectorSchema, arrayEvidence).some((error) => /evidence|object/.test(error)));
});

test("portfolio digest schema rejects scored verdicts with null scores", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(REPO, "schemas/portfolio-digest.schema.json"), "utf8"));
  const invalid = digest("schema-null-scores", true);
  invalid.prior_theses[0].depth_vector = { verdict: "ADVANCE", scores: null };
  assert.ok(validate(schema, invalid).some((error) => /scores.*object/.test(error)));
  invalid.prior_theses[0].depth_vector = { verdict: "UNKNOWN", scores: null };
  assert.deepEqual(validate(schema, invalid), []);
});

test("fabricated empty portfolio digest is rejected when a sibling thesis exists", () => {
  const dir = tmp();
  const id = "dishonest-digest";
  try {
    const runDir = prepareIntake(dir, id, true);
    writeJson(path.join(runDir, "intake/portfolio-digest.json"), digest(id, false));
    appendPhase(runDir, id, "toolchain");
    const result = run("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /digest stale\/dishonest — regenerate via npm run portfolio:digest/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readIntakeEvidence rejects forged prior ADVANCE scores", () => {
  const root = tmp();
  const studio = path.join(root, "studio");
  const design = path.join(studio, "design");
  const id = "forged-scores";
  try {
    fs.mkdirSync(studio, { recursive: true });
    fs.writeFileSync(path.join(studio, "DISCIPLINES.md"), "# fixture\n");
    const runDir = path.join(design, ".tgf", "seeds", id);
    const priorDir = path.join(design, ".tgf", "seeds", "prior-one");
    writeEmbedded(path.join(priorDir, "GAME_THESIS.md"), "Prior Thesis", {
      pitch: "prior",
      design_register: "mechanics-first",
      golden_moment: "prior moment",
      core_loop_candidates: [{ id: "loop-a", verbs: "plant, water, rotate" }]
    });
    writeJson(path.join(priorDir, "reviews", "depth-vector.json"), {
      scores: SCORES,
      total: 17,
      verdict: "ADVANCE"
    });
    const portfolio = openPortfolio(design);
    const digestPath = path.join(runDir, "intake", "portfolio-digest.json");
    const forged = {
      ...portfolio.buildDigestContent(id),
      seed_id: id,
      generated_at: GENERATED_AT
    };
    forged.prior_theses[0].depth_vector.scores = Object.fromEntries(AXES.map((axis) => [axis, 0]));
    writeJson(digestPath, forged);
    writeEmbedded(path.join(runDir, "intake", "office-hours.md"), "Office Hours", intake(id));

    const evidence = portfolio.readIntakeEvidence(runDir, id);
    assert.match(
      evidence.errors.join("\n"),
      /digest stale\/dishonest — regenerate via npm run portfolio:digest/
    );
    assert.equal(portfolioForDigest(evidence.digest, root), portfolio);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("readIntakeEvidence rejects omitted parked proposal rows", () => {
  const root = tmp();
  const studio = path.join(root, "studio");
  const design = path.join(studio, "design");
  const id = "omitted-proposal";
  try {
    fs.mkdirSync(studio, { recursive: true });
    fs.writeFileSync(path.join(studio, "DISCIPLINES.md"), "# fixture\n");
    const runDir = path.join(design, ".tgf", "seeds", id);
    writeEmbedded(path.join(studio, "games/_proposals/parked-one/GAME_THESIS.md"), "Parked Thesis", {
      pitch: "parked",
      design_register: "hybrid",
      golden_moment: "a route closes",
      core_loop_candidates: [{ id: "loop-a", verbs: ["bind", "turn"] }]
    });
    const portfolio = openPortfolio(design);
    const digestPath = path.join(runDir, "intake", "portfolio-digest.json");
    const stored = {
      ...portfolio.buildDigestContent(id),
      seed_id: id,
      generated_at: GENERATED_AT
    };
    assert.equal(stored.prior_theses.find((row) => row.seed_id === "parked-one").parked, true);
    stored.prior_theses = stored.prior_theses.filter((row) => row.seed_id !== "parked-one");
    writeJson(digestPath, stored);
    writeEmbedded(path.join(runDir, "intake", "office-hours.md"), "Office Hours", intake(id));

    assert.match(
      portfolio.readIntakeEvidence(runDir, id).errors.join("\n"),
      /digest stale\/dishonest — regenerate via npm run portfolio:digest/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("advance-run refuses portfolio intake to toolchain without intake artifacts", () => {
  const dir = tmp();
  const id = "advance-intake-gate";
  try {
    assert.equal(run("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], dir).status, 0);
    const result = run("advance-run.mjs", [
      "--seed-id", id, "--to", "toolchain", "--event", "skip-intake", "--status", "passed"
    ], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /intake evidence invalid/);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, ".tgf/seeds", id, "manifest.json"), "utf8"));
    assert.equal(manifest.current_phase, "intake");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

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
    const built = run("build-portfolio-digest.mjs", ["--seed-id", id], dir);
    assert.equal(built.status, 0, built.stdout + built.stderr);
    const digestPath = path.join(runDir, "intake/portfolio-digest.json");
    const builtDigest = JSON.parse(fs.readFileSync(digestPath, "utf8"));
    builtDigest.generated_at = GENERATED_AT;
    writeJson(digestPath, builtDigest);
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
    const distinctScores = { ...SCORES, expression: 2 };
    writeJson(vectorPath, {
      schema_version: "2.0.0", scores: distinctScores, total: 18, register: "mechanics-first",
      evidence, review_provenance: { mode: "independent", reviewer_note: "cold review" }, verdict: "ADVANCE"
    });
    result = run("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /distinctness disposition naming nearest prior seed 'prior-one'/i);

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
