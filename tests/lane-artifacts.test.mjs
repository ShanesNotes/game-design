import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPTH_AXES } from "../scripts/lib/portfolio-memory.mjs";
import { LEAK_TOKENS } from "../scripts/lib/leakage.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function run(script, args, cwd, env = {}) {
  return spawnSync(process.execPath, [path.join(REPO, "scripts", script), ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env }
  });
}

function writeEmbedded(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `# Artifact\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`);
}

test("generate-g1-brief requires ADVANCE and renders a content-only taste brief", () => {
  const dir = tmp("g1-brief-");
  const id = "g1-brief-test";
  try {
    assert.equal(run("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], dir).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const thesis = JSON.parse(fs.readFileSync(path.join(REPO, "examples/fixtures/minimal-game-thesis.json"), "utf8"));
    thesis.schema_version = "2.0.0";
    thesis.pitch = "First sentence. Second sentence. Third sentence. Fourth sentence.";
    thesis.portfolio_distinctness = {
      nearest_prior_seed: "prior-one",
      falsifying_difference: "The water move removes a route before rotation.",
      digest_generated_at: "2026-07-12T12:00:00.000Z"
    };
    thesis.out_of_scope = ["No inventory: tools remain in hand."];
    writeEmbedded(path.join(runDir, "GAME_THESIS.md"), thesis);
    const manifestPath = path.join(runDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.factory_version = "0.1.0";
    delete manifest.design_lane;
    manifest.current_phase = "engine-profile";
    manifest.game_thesis_path = `.tgf/seeds/${id}/GAME_THESIS.md`;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    const ledgerPath = path.join(runDir, "execution-ledger.jsonl");
    const firstRow = JSON.parse(fs.readFileSync(ledgerPath, "utf8").trim());
    firstRow.phase = "toolchain";
    firstRow.lane = "solo";
    const laterRows = ["thesis", "design-review", "engine-profile"].map((phase) => ({
      ts: "2026-07-12T12:00:00.000Z", seed_id: id, phase,
      event: "test-advance", status: "checkpointed", actor: "test"
    }));
    fs.writeFileSync(ledgerPath, [firstRow, ...laterRows].map(JSON.stringify).join("\n") + "\n");

    const scores = Object.fromEntries(DEPTH_AXES.map((axis) => [axis, 1]));
    for (const axis of ["meaningful_choice", "tradeoff", "pressure", "uncertainty", "mastery", "replayable_variation"]) scores[axis] = 2;
    scores.failure_recovery = 0;
    const vector = {
      schema_version: "2.0.0",
      scores,
      total: Object.values(scores).reduce((sum, score) => sum + score, 0),
      register: "mechanics-first",
      evidence: Object.fromEntries(DEPTH_AXES.map((axis) => [axis, "depth_mechanisms[0]"])),
      review_provenance: { mode: "independent", reviewer_note: "fixture" },
      verdict: "DEEPEN"
    };
    fs.writeFileSync(path.join(runDir, "reviews", "depth-vector.json"), JSON.stringify(vector, null, 2) + "\n");
    fs.writeFileSync(path.join(runDir, "reviews", "ANTI_BORING_VERDICT.md"), "Verdict: DEEPEN\n");
    let result = run("generate-g1-brief.mjs", ["--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.ok(!fs.existsSync(path.join(runDir, "reviews", "G1_BRIEF.md")));

    vector.verdict = "ADVANCE";
    fs.writeFileSync(path.join(runDir, "reviews", "depth-vector.json"), JSON.stringify(vector, null, 2) + "\n");
    fs.writeFileSync(path.join(runDir, "reviews", "ANTI_BORING_VERDICT.md"), "Verdict: KILL\nThe prior ADVANCE was invalid.\n");
    result = run("generate-g1-brief.mjs", ["--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);

    fs.writeFileSync(path.join(runDir, "reviews", "ANTI_BORING_VERDICT.md"), "VERDICT:\nADVANCE | DEEPEN | KILL\n");
    result = run("generate-g1-brief.mjs", ["--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);

    fs.writeFileSync(path.join(runDir, "reviews", "ANTI_BORING_VERDICT.md"), "Verdict: ADVANCE\nDistinctness: prior-one remains falsified by route removal.\n");
    result = run("generate-g1-brief.mjs", ["--seed-id", id], dir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const brief = fs.readFileSync(path.join(runDir, "reviews", "G1_BRIEF.md"), "utf8");
    assert.match(brief, /First sentence\. Second sentence\. Third sentence\./);
    assert.doesNotMatch(brief, /Fourth sentence/);
    assert.match(brief, new RegExp(`Total: ${vector.total}/24`));
    assert.match(brief, /failure_recovery: 0\/2 — depth_mechanisms\[0\]/);
    assert.match(brief, /What Shane is being asked to taste-judge/);
    for (const [token, label] of LEAK_TOKENS) assert.doesNotMatch(brief, token, label);

    thesis.out_of_scope = ["Read .tgf state."];
    writeEmbedded(path.join(runDir, "GAME_THESIS.md"), thesis);
    fs.rmSync(path.join(runDir, "reviews", "G1_BRIEF.md"));
    result = run("generate-g1-brief.mjs", ["--seed-id", id], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /rendered brief failed leakage gate/);
    assert.ok(!fs.existsSync(path.join(runDir, "reviews", "G1_BRIEF.md")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("generate-seed-brief targets count gaps and --init stops at an auto yolo intake run", () => {
  const root = tmp("seed-auto-");
  const studio = path.join(root, "studio");
  const design = path.join(studio, "design");
  const env = { STUDIO_ROOT: studio, GAME_DESIGN_ROOT: design };
  try {
    fs.mkdirSync(path.join(studio, "games", "_proposals"), { recursive: true });
    fs.mkdirSync(design, { recursive: true });
    fs.writeFileSync(path.join(studio, "DISCIPLINES.md"), "# fixture\n");
    writeEmbedded(path.join(design, ".tgf/seeds/one/GAME_THESIS.md"), {
      pitch: "one", design_register: "mechanics-first", golden_moment: "one",
      core_loop_candidates: [{ id: "loop", verbs: ["plant"] }]
    });
    writeEmbedded(path.join(design, ".tgf/seeds/one/SPEC.md"), { chosen_loop_id: "loop" });
    writeEmbedded(path.join(design, ".tgf/seeds/two/GAME_THESIS.md"), {
      pitch: "two", design_register: "narrative-first", golden_moment: "two",
      core_loop_candidates: [{ id: "loop", verbs: ["plant", "turn"] }]
    });
    writeEmbedded(path.join(design, ".tgf/seeds/two/SPEC.md"), { chosen_loop_id: "loop" });
    writeEmbedded(path.join(studio, "games/_proposals/parked/GAME_THESIS.md"), {
      pitch: "parked", design_register: "world-first", golden_moment: "parked",
      core_loop_candidates: [{ id: "candidate", verbs: ["listen"] }]
    });

    let result = run("generate-seed-brief.mjs", [], design, env);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /SEED: A hybrid game centered on listen/);
    assert.match(result.stdout, /WHY:\nGap: hybrid appears 0 time\(s\).*'listen' appears 1 time\(s\)/s);
    assert.ok(!fs.existsSync(path.join(design, ".tgf/seeds/auto-hybrid-listen")));

    result = run("generate-seed-brief.mjs", ["--init"], design, env);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const runDir = path.join(design, ".tgf", "seeds", "auto-hybrid-listen");
    const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
    assert.deepEqual(manifest.design_lane, { mode: "yolo", stop_line: "pack", origination: "auto" });
    assert.equal(manifest.current_phase, "intake");
    assert.ok(!fs.existsSync(path.join(runDir, "GAME_THESIS.md")));
    assert.match(fs.readFileSync(path.join(runDir, "GAME_SEED.md"), "utf8"), /A hybrid game centered on listen/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
