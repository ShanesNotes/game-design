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
      core_loop_candidates: [
        { id: "loop-a", verbs: ["plant", "turn"] },
        { id: "loop-b", verbs: ["graft", "reroute"] }
      ]
    });
    writeThesis(path.join(design, ".tgf/seeds/prior-one/SPEC.md"), { chosen_loop_id: "loop-b" });
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
    writeThesis(path.join(studio, "games/_proposals/parked-one/GAME_THESIS.md"), {
      pitch: "A parked pitch",
      design_register: "world-first",
      golden_moment: "A route closes after the player marks it",
      core_loop_candidates: [{ id: "parked-loop", verbs: ["mark", "reroute"] }]
    });
    writeJson(path.join(studio, "contracts/verdict-record.schema.json"), {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "verdict-record",
      type: "object",
      additionalProperties: false,
      required: ["schema_version", "ts", "verdict", "by", "game_commit", "manifest_digest", "lock_digest", "report"],
      properties: {
        schema_version: { enum: ["1.0.0"] },
        ts: { type: "string" },
        verdict: { enum: ["done", "notes", "hold"] },
        by: { type: "string" },
        game_commit: { type: "string" },
        manifest_digest: { type: "string" },
        lock_digest: { type: "string" },
        report: {
          type: "object",
          additionalProperties: false,
          required: ["digest", "overall"],
          properties: { digest: { type: "string" }, overall: { enum: ["pass", "fail"] } }
        }
      }
    });
    fs.writeFileSync(path.join(studio, "games/INDEX.md"), `# games/ — lifecycle index

| From → To | Writer | Trigger |
|---|---|---|
| worldgen-002 | active | forge intake |

Lifecycle enum: fixture.

| game | lifecycle | origin | note |
|---|---|---|---|
| prior-one | done | fixture | sealed |
| no-verdict | active | fixture | none |
| ../secret | active | fixture | traversal attempt |

| game | lifecycle | origin | note |
|---|---|---|---|
| decoy-after-table | active | fixture | must be ignored |
`);
    writeJson(path.join(studio, "games/prior-one/playtests/verdicts/2026-07-12T11-00-00Z.json"), {
      schema_version: "1.0.0",
      ts: "2026-07-12T12:00:00.000Z",
      verdict: "done",
      by: "Shane",
      game_commit: "abc123",
      manifest_digest: "manifest",
      lock_digest: "lock",
      report: { digest: "report", overall: "pass" }
    });
    writeJson(path.join(studio, "games/prior-one/playtests/verdicts/2026-07-12T12-00-00Z.json"), {
      schema_version: "1.0.0",
      ts: "not-a-date",
      verdict: "done"
    });
    writeJson(path.join(studio, "secret/playtests/verdicts/attacker.json"), {
      schema_version: "1.0.0",
      ts: "2026-07-12T12:00:00.000Z",
      verdict: "done",
      by: "attacker",
      game_commit: "outside",
      manifest_digest: "outside",
      lock_digest: "outside",
      report: { digest: "outside", overall: "pass" }
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
    assert.deepEqual(digest.prior_theses.map((row) => row.seed_id), ["parked-one", "prior-one"]);
    const prior = digest.prior_theses.find((row) => row.seed_id === "prior-one");
    const parked = digest.prior_theses.find((row) => row.seed_id === "parked-one");
    assert.equal(prior.chosen_loop.id, "loop-b");
    assert.deepEqual(prior.depth_vector.scores, scores);
    assert.equal(parked.parked, true);
    assert.equal(parked.chosen_loop, null);
    assert.deepEqual(parked.candidate_loop_verbs, ["mark", "reroute"]);
    assert.deepEqual(parked.depth_vector, { verdict: "UNKNOWN", scores: null });
    assert.ok(digest.sources.some((row) => row.source === "proposals" && row.status === "read"));
    assert.equal(digest.games.find((row) => row.game_id === "prior-one").human_verdict.verdict, "done");
    assert.equal(digest.games.find((row) => row.game_id === "prior-one").human_verdict.ts, "2026-07-12T12:00:00.000Z");
    assert.equal(digest.games.find((row) => row.game_id === "no-verdict").human_verdict.verdict, "UNKNOWN");
    assert.equal(digest.games.some((row) => row.game_id === "worldgen-002"), false);
    assert.equal(digest.games.some((row) => row.game_id === "decoy-after-table"), false);
    assert.equal(digest.games.some((row) => row.game_id === "../secret"), false);
    assert.ok(digest.skipped.some((row) => row.id === "../secret" && row.reason === "invalid game id"));
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
    assert.ok(digest.skipped.some((row) => row.source === "proposals"));
    assert.ok(digest.skipped.some((row) => row.source === "games-index"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("portfolio digest skips a symlinked game directory that escapes games root", (t) => {
  const root = tmp();
  const studio = path.join(root, "studio");
  const work = path.join(root, "work");
  const outside = path.join(root, "outside-game");
  try {
    fs.mkdirSync(path.join(studio, "games"), { recursive: true });
    fs.mkdirSync(work, { recursive: true });
    fs.writeFileSync(path.join(studio, "DISCIPLINES.md"), "# fixture\n");
    fs.writeFileSync(path.join(studio, "games", "INDEX.md"), `| game | lifecycle | origin | note |
|---|---|---|---|
| evil-game | active | fixture | symlink escape |
`);
    writeJson(path.join(studio, "contracts", "verdict-record.schema.json"), {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "verdict-record",
      type: "object",
      additionalProperties: false,
      required: ["schema_version", "ts", "verdict", "by", "game_commit", "manifest_digest", "lock_digest", "report"],
      properties: {
        schema_version: { enum: ["1.0.0"] },
        ts: { type: "string" },
        verdict: { enum: ["done"] },
        by: { type: "string" },
        game_commit: { type: "string" },
        manifest_digest: { type: "string" },
        lock_digest: { type: "string" },
        report: {
          type: "object",
          additionalProperties: false,
          required: ["digest", "overall"],
          properties: { digest: { type: "string" }, overall: { enum: ["pass"] } }
        }
      }
    });
    writeJson(path.join(outside, "playtests", "verdicts", "sealed.json"), {
      schema_version: "1.0.0",
      ts: "2026-07-12T12:00:00.000Z",
      verdict: "done",
      by: "symlink-attacker",
      game_commit: "outside",
      manifest_digest: "outside",
      lock_digest: "outside",
      report: { digest: "outside", overall: "pass" }
    });
    try {
      fs.symlinkSync(outside, path.join(studio, "games", "evil-game"), "dir");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) {
        t.skip(`symlinks unavailable: ${error.code}`);
        return;
      }
      throw error;
    }

    const result = spawnSync(process.execPath, [
      path.join(REPO, "scripts/build-portfolio-digest.mjs"), "--seed-id", "current-seed"
    ], {
      cwd: work,
      encoding: "utf8",
      env: { ...process.env, STUDIO_ROOT: studio, GAME_DESIGN_ROOT: path.join(studio, "design") }
    });
    assert.equal(result.status, 0, result.stderr);
    const digest = JSON.parse(fs.readFileSync(
      path.join(work, ".tgf/seeds/current-seed/intake/portfolio-digest.json"), "utf8"
    ));
    assert.equal(digest.games.some((row) => row.game_id === "evil-game"), false);
    assert.ok(digest.skipped.some((row) => row.id === "evil-game" && row.reason === "invalid game id"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("portfolio digest rejects a nested verdicts symlink that escapes games root", (t) => {
  const root = tmp();
  const studio = path.join(root, "studio");
  const work = path.join(root, "work");
  const outside = path.join(root, "outside-verdicts");
  try {
    fs.mkdirSync(path.join(studio, "games", "real-game", "playtests"), { recursive: true });
    fs.mkdirSync(work, { recursive: true });
    fs.writeFileSync(path.join(studio, "DISCIPLINES.md"), "# fixture\n");
    fs.writeFileSync(path.join(studio, "games", "INDEX.md"), `| game | lifecycle | origin | note |
|---|---|---|---|
| real-game | active | fixture | nested symlink escape |
`);
    writeJson(path.join(outside, "sealed.json"), {
      schema_version: "1.0.0",
      ts: "2026-07-12T12:00:00.000Z",
      verdict: "done",
      by: "nested-symlink-attacker",
      game_commit: "outside",
      manifest_digest: "outside",
      lock_digest: "outside",
      report: { digest: "outside", overall: "pass" }
    });
    try {
      fs.symlinkSync(outside, path.join(studio, "games", "real-game", "playtests", "verdicts"), "dir");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) {
        t.skip(`symlinks unavailable: ${error.code}`);
        return;
      }
      throw error;
    }

    const result = spawnSync(process.execPath, [
      path.join(REPO, "scripts/build-portfolio-digest.mjs"), "--seed-id", "current-seed"
    ], {
      cwd: work,
      encoding: "utf8",
      env: { ...process.env, STUDIO_ROOT: studio, GAME_DESIGN_ROOT: path.join(studio, "design") }
    });
    assert.equal(result.status, 0, result.stderr);
    const digest = JSON.parse(fs.readFileSync(
      path.join(work, ".tgf/seeds/current-seed/intake/portfolio-digest.json"), "utf8"
    ));
    const row = digest.games.find((r) => r.game_id === "real-game");
    assert.ok(row, "real-game row present");
    assert.equal(row.human_verdict.verdict, "UNKNOWN");
    assert.ok(digest.skipped.some((r) => r.id === "real-game" && /escapes games root/.test(r.reason)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("portfolio digest skips a proposal directory symlink that escapes games root", (t) => {
  const root = tmp();
  const studio = path.join(root, "studio");
  const work = path.join(root, "work");
  const outside = path.join(root, "outside-proposal");
  try {
    fs.mkdirSync(path.join(studio, "games", "_proposals"), { recursive: true });
    fs.mkdirSync(work, { recursive: true });
    writeThesis(path.join(outside, "GAME_THESIS.md"), { pitch: "escaped directory thesis" });
    try {
      fs.symlinkSync(outside, path.join(studio, "games", "_proposals", "evil-parked"), "dir");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) {
        t.skip(`symlinks unavailable: ${error.code}`);
        return;
      }
      throw error;
    }

    const result = spawnSync(process.execPath, [
      path.join(REPO, "scripts/build-portfolio-digest.mjs"), "--seed-id", "current-seed"
    ], {
      cwd: work,
      encoding: "utf8",
      env: { ...process.env, STUDIO_ROOT: studio, GAME_DESIGN_ROOT: path.join(studio, "design") }
    });
    assert.equal(result.status, 0, result.stderr);
    const digest = JSON.parse(fs.readFileSync(
      path.join(work, ".tgf/seeds/current-seed/intake/portfolio-digest.json"), "utf8"
    ));
    assert.equal(digest.prior_theses.some((row) => row.seed_id === "evil-parked"), false);
    assert.ok(digest.skipped.some((row) =>
      row.source === "proposal-thesis"
      && row.id === "evil-parked"
      && /proposal directory escapes games root/.test(row.reason)
    ));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("portfolio digest skips a proposal thesis symlink that escapes games root", (t) => {
  const root = tmp();
  const studio = path.join(root, "studio");
  const work = path.join(root, "work");
  const outside = path.join(root, "outside-thesis.md");
  try {
    const proposalDir = path.join(studio, "games", "_proposals", "nested");
    fs.mkdirSync(proposalDir, { recursive: true });
    fs.mkdirSync(work, { recursive: true });
    writeThesis(outside, { pitch: "escaped file thesis" });
    try {
      fs.symlinkSync(outside, path.join(proposalDir, "GAME_THESIS.md"), "file");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) {
        t.skip(`symlinks unavailable: ${error.code}`);
        return;
      }
      throw error;
    }

    const result = spawnSync(process.execPath, [
      path.join(REPO, "scripts/build-portfolio-digest.mjs"), "--seed-id", "current-seed"
    ], {
      cwd: work,
      encoding: "utf8",
      env: { ...process.env, STUDIO_ROOT: studio, GAME_DESIGN_ROOT: path.join(studio, "design") }
    });
    assert.equal(result.status, 0, result.stderr);
    const digest = JSON.parse(fs.readFileSync(
      path.join(work, ".tgf/seeds/current-seed/intake/portfolio-digest.json"), "utf8"
    ));
    assert.equal(digest.prior_theses.some((row) => row.seed_id === "nested"), false);
    assert.ok(digest.skipped.some((row) =>
      row.source === "proposal-thesis"
      && row.id === "nested"
      && /proposal thesis escapes games root/.test(row.reason)
    ));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
