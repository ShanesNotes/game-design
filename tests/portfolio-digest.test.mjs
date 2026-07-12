import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../scripts/lib/validate-json-schema.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-digest-"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function writeThesis(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `# GAME_THESIS.md\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`);
}

const scores = {
  meaningful_choice: 2,
  tradeoff: 2,
  pressure: 2,
  uncertainty: 1,
  progression: 1,
  mastery: 2,
  combinatorial: 1,
  emergence: 1,
  replayable_variation: 2,
  failure_recovery: 1,
  expression: 1,
  expansion_headroom: 1
};

test("portfolio digest records prior design evidence and sealed human verdicts", () => {
  const root = tmp();
  const studio = path.join(root, "studio");
  const design = path.join(studio, "design");
  const work = path.join(root, "work");
  try {
    fs.mkdirSync(studio, { recursive: true });
    fs.mkdirSync(work, { recursive: true });
    fs.writeFileSync(path.join(studio, "DISCIPLINES.md"), "# fixture\n");
    writeThesis(path.join(design, ".tgf/seeds/prior-one/GAME_THESIS.md"), {
      pitch: "A prior pitch",
      design_register: "mechanics-first",
      golden_moment: "A prior golden moment",
      core_loop_candidates: [{ id: "loop-a", verbs: ["plant", "turn"] }]
    });
    writeJson(path.join(design, ".tgf/seeds/prior-one/reviews/depth-vector.json"), {
      scores,
      total: 17,
      verdict: "ADVANCE"
    });
    writeThesis(path.join(design, ".tgf/seeds/current-seed/GAME_THESIS.md"), {
      pitch: "Must be excluded",
      core_loop_candidates: [{ id: "loop-current", verbs: ["skip"] }]
    });
    fs.mkdirSync(path.join(studio, "games"), { recursive: true });
    fs.writeFileSync(path.join(studio, "games/INDEX.md"), `
| game | lifecycle | origin | note |
|---|---|---|---|
| prior-one | done | fixture | sealed |
| no-verdict | active | fixture | none |
`);
    writeJson(path.join(studio, "games/prior-one/playtests/verdicts/2026-07-12T12-00-00Z.json"), {
      schema_version: "1.0.0",
      ts: "2026-07-12T12:00:00.000Z",
      verdict: "done",
      by: "Shane",
      game_commit: "abc123",
      manifest_digest: "manifest",
      lock_digest: "lock",
      report: { digest: "report", overall: "pass" }
    });

    const result = spawnSync(process.execPath, [
      path.join(REPO, "scripts/build-portfolio-digest.mjs"),
      "--seed-id", "current-seed"
    ], {
      cwd: work,
      encoding: "utf8",
      env: { ...process.env, STUDIO_ROOT: studio, GAME_DESIGN_ROOT: design }
    });
    assert.equal(result.status, 0, result.stderr);
    const digestPath = path.join(work, ".tgf/seeds/current-seed/intake/portfolio-digest.json");
    const digest = JSON.parse(fs.readFileSync(digestPath, "utf8"));
    const schema = JSON.parse(fs.readFileSync(path.join(REPO, "schemas/portfolio-digest.schema.json"), "utf8"));
    assert.deepEqual(validate(schema, digest), []);
    assert.deepEqual(digest.prior_theses.map((row) => row.seed_id), ["prior-one"]);
    assert.equal(digest.prior_theses[0].chosen_loop.id, "loop-a");
    assert.deepEqual(digest.prior_theses[0].depth_vector.scores, scores);
    assert.equal(digest.games.find((row) => row.game_id === "prior-one").human_verdict.verdict, "done");
    assert.equal(digest.games.find((row) => row.game_id === "no-verdict").human_verdict.verdict, "UNKNOWN");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("portfolio digest makes missing portfolio roots explicit", () => {
  const root = tmp();
  try {
    const result = spawnSync(process.execPath, [
      path.join(REPO, "scripts/build-portfolio-digest.mjs"),
      "--seed-id", "missing-roots"
    ], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, STUDIO_ROOT: path.join(root, "absent-studio"), GAME_DESIGN_ROOT: path.join(root, "absent-design") }
    });
    assert.equal(result.status, 0, result.stderr);
    const digest = JSON.parse(fs.readFileSync(path.join(root, ".tgf/seeds/missing-roots/intake/portfolio-digest.json"), "utf8"));
    assert.ok(digest.skipped.some((row) => row.source === "design-runs"));
    assert.ok(digest.skipped.some((row) => row.source === "games-index"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
