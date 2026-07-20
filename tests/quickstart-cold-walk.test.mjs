// DES-B — cold-walk regression for the README Quickstart golden path.
//
// A cold agent following ONLY the Quickstart + the shipped example fixtures must
// reach a green `package-spec --write --require-manifest` export under
// factory_version 0.3.0 defaults (portfolio intake gate, v2 thesis/depth-vector,
// ANTI_BORING_VERDICT distinctness disposition). This test drives exactly that
// documented sequence — init-game-run → portfolio digest + office-hours →
// advance-run ×6 → fixtures as the authored artifacts → emit-local-issues →
// package-spec — inside a hermetic temp studio, so the docs and fixtures can
// never drift behind the pipeline silently again.
//
// Studio fabrication (all under os.tmpdir, removed in finally):
//   contracts/  — read-only copy of the real contracts schemas (pins + export
//                 validation need them);
//   assets/, lore/ — throwaway git repos (pins are git HEAD SHAs);
//   games/INDEX.md — empty canonical table (no real games are read);
//   STUDIO_ROOT + GAME_DESIGN_ROOT point at the temp root so the run's
//   .tgf/seeds is the portfolio the digest enumerates.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../scripts/lib/validate-json-schema.mjs";
import { openPortfolio } from "../scripts/lib/portfolio-memory.mjs";
import { findStudioRoot } from "../scripts/lib/studio-paths.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(REPO, ...p);
// The fixtures' seed_id, so SPEC.md ships verbatim for the worked example.
const ID = "tiny-asteroid-gardening";

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tgf-cold-walk-"));
}

function node(script, args, dir) {
  return spawnSync(process.execPath, [rel("scripts", script), ...args], {
    encoding: "utf8",
    cwd: dir,
    env: { ...process.env, STUDIO_ROOT: dir, GAME_DESIGN_ROOT: dir }
  });
}

function step(result, label) {
  assert.equal(result.status, 0, `${label}\n${result.stdout || ""}${result.stderr || ""}`);
}

function writeEmbedded(file, heading, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `# ${heading}\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`);
}

function gitRepo(dir) {
  fs.mkdirSync(dir, { recursive: true });
  assert.equal(spawnSync("git", ["init", "-q"], { cwd: dir }).status, 0);
  fs.writeFileSync(path.join(dir, "README.md"), "# cold-walk fixture\n");
  assert.equal(spawnSync("git", ["add", "."], { cwd: dir }).status, 0);
  const commit = spawnSync("git", [
    "-c", "user.email=cold-walk@example.invalid", "-c", "user.name=cold-walk",
    "commit", "-q", "-m", "fixture"
  ], { cwd: dir, encoding: "utf8" });
  assert.equal(commit.status, 0, commit.stderr);
}

// Hermetic studio: real contracts schemas (read-only copy), throwaway asset/lore
// git repos, empty games index. Returns the contracts schema for pack validation.
function fabricateStudio(dir) {
  const studio = findStudioRoot(REPO) || process.env.STUDIO_ROOT;
  assert.ok(studio, "a studio root must resolve to copy the contracts schema from");
  const contractsSrc = path.join(studio, "contracts");
  for (const name of ["forge-manifest.schema.json", "verdict-record.schema.json"]) {
    const src = path.join(contractsSrc, name);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.join(dir, "contracts"), { recursive: true });
      fs.copyFileSync(src, path.join(dir, "contracts", name));
    }
  }
  assert.ok(
    fs.existsSync(path.join(dir, "contracts", "forge-manifest.schema.json")),
    "contracts/forge-manifest.schema.json must be copyable from the studio"
  );
  gitRepo(path.join(dir, "assets"));
  gitRepo(path.join(dir, "lore"));
  fs.mkdirSync(path.join(dir, "games"), { recursive: true });
  fs.writeFileSync(path.join(dir, "games", "INDEX.md"), [
    "# Games Index",
    "",
    "| Game | Lifecycle | Origin | Note |",
    "| ---- | --------- | ------ | ---- |",
    ""
  ].join("\n"));
  return JSON.parse(fs.readFileSync(path.join(dir, "contracts", "forge-manifest.schema.json"), "utf8"));
}

// The intake grill answers, same skeleton the Quickstart documents
// (schemas/intake-grill.schema.json).
function officeHours(id) {
  return {
    schema_version: "1.0.0",
    seed_id: id,
    portfolio_digest_ref: `.tgf/seeds/${id}/intake/portfolio-digest.json`,
    demand_reality: "EXAMPLE — players retry short timing puzzles to master them",
    status_quo: "EXAMPLE — stationary garden/tile puzzles with no time pressure",
    desperate_specificity: "EXAMPLE — one asteroid, one sun-band, one water budget",
    narrow_playable_wedge: "EXAMPLE — a 60-second plant/water/rotate loop",
    observation_evidence: "EXAMPLE — action spread across the three loop verbs",
    premise_challenge: "EXAMPLE — rotation timing could dominate the other verbs",
    alternatives: "EXAMPLE — a relocate-the-garden loop instead of rotate-the-rock",
    future_fit: "EXAMPLE — new asteroid rules and plant types after fun-lock",
    store_positioning: "EXAMPLE — one-screen timing garden, not a farming sim",
    reviewer_concern: "EXAMPLE — reads as a derivative resource skin if the sun-band is weak"
  };
}

// The godot-4 engine decision the Quickstart documents for a forge-bound pack.
function engineDecision(id) {
  return {
    seed_id: id,
    status: "accepted",
    date: "2026-07-20",
    decision: "godot-4 for headless scene tooling",
    profile: "godot-4",
    godot_min: "4.6.2",
    godot_max: "4.7.0",
    renderer: "gl_compatibility",
    language: "gdscript",
    rationale: "Deterministic headless probes and scene-tree tooling for the tracer slice.",
    rejected: [{ profile: "raw Canvas + TS", why: "no scene tree; weaker 3D headroom" }],
    reversal_triggers: ["editor opacity blocks bots"]
  };
}

// Records the walk's temp studio so the cleanup test can prove it is gone.
let lastWalkDir = null;

test("DES-B fixtures: v2 thesis + gate-passing v2 depth vector + verdict disposition cohere", () => {
  const thesis = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8"));
  assert.equal(thesis.schema_version, "2.0.0", "thesis fixture must teach the 2.0.0 shape");
  assert.ok(thesis.portfolio_distinctness, "thesis fixture must carry portfolio_distinctness");
  assert.match(thesis.portfolio_distinctness.digest_generated_at, /EXAMPLE/, "placeholder must be labeled EXAMPLE");

  const vector = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-depth-vector.json"), "utf8"));
  assert.equal(vector.schema_version, "2.0.0", "depth-vector fixture must teach the 2.0.0 shape");
  const vectorSchema = JSON.parse(fs.readFileSync(rel("schemas/depth-vector.schema.json"), "utf8"));
  assert.deepEqual(validate(vectorSchema, vector), []);

  // The portfolio checker must accept the fixture pair against an empty
  // portfolio (nearest_prior_seed "none") with the shipped example verdict.
  const verdictText = fs.readFileSync(rel("examples/reviews/ANTI_BORING_VERDICT.md"), "utf8");
  assert.match(verdictText, /EXAMPLE/, "sample verdict must be labeled EXAMPLE");
  const portfolio = openPortfolio(REPO);
  const errors = portfolio.depthVectorErrors(vector, thesis, { prior_theses: [] }, verdictText);
  assert.deepEqual(errors, [], `fixture vector + verdict must pass portfolio checks:\n${errors.join("\n")}`);
});

test("DES-B cold walk: Quickstart + fixtures reach a green --require-manifest export", () => {
  const dir = tmp();
  lastWalkDir = dir;
  try {
    const contractsSchema = fabricateStudio(dir);
    const runDir = path.join(dir, ".tgf", "seeds", ID);

    // 1. init (documented in Quickstart)
    step(node("init-game-run.mjs", ["--seed-id", ID, "--seed", "tiny asteroid gardening"], dir), "init-game-run");

    // 2. intake: digest + office-hours (both human-facing artifacts of the 0.3.0 gate)
    step(node("build-portfolio-digest.mjs", ["--seed-id", ID], dir), "portfolio digest");
    writeEmbedded(path.join(runDir, "intake", "office-hours.md"), "Office Hours", officeHours(ID));
    step(node("advance-run.mjs", ["--seed-id", ID, "--to", "toolchain",
      "--event", "intake-complete", "--status", "passed"], dir), "advance intake->toolchain");

    // 3. toolchain: probes are environment work, no authored artifact; advance.
    step(node("advance-run.mjs", ["--seed-id", ID, "--to", "thesis",
      "--event", "toolchain-verified", "--status", "passed"], dir), "advance toolchain->thesis");

    // 4. thesis: author GAME_THESIS.md from the v2 fixture; the one substitution
    //    the Quickstart documents is the digest's generated_at.
    const digest = JSON.parse(fs.readFileSync(path.join(runDir, "intake", "portfolio-digest.json"), "utf8"));
    const thesis = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8"));
    thesis.portfolio_distinctness.digest_generated_at = digest.generated_at;
    writeEmbedded(path.join(runDir, "GAME_THESIS.md"), "GAME_THESIS.md", thesis);
    step(node("advance-run.mjs", ["--seed-id", ID, "--to", "design-review",
      "--event", "thesis-compiled", "--status", "passed",
      "--set", `game_thesis_path=.tgf/seeds/${ID}/GAME_THESIS.md`], dir), "advance thesis->design-review");

    // 5. design-review: fixture depth vector + shipped example verdict, then
    //    prove the run validates (portfolio depth checks + distinctness disposition).
    fs.writeFileSync(path.join(runDir, "reviews", "depth-vector.json"),
      fs.readFileSync(rel("examples/fixtures/minimal-depth-vector.json"), "utf8"));
    fs.copyFileSync(rel("examples/reviews/ANTI_BORING_VERDICT.md"),
      path.join(runDir, "reviews", "ANTI_BORING_VERDICT.md"));
    step(node("validate-artifacts.mjs", ["--check", "run", "--seed-id", ID], dir), "run validates at design-review");
    step(node("advance-run.mjs", ["--seed-id", ID, "--to", "engine-profile",
      "--event", "design-lock", "--status", "passed"], dir), "advance design-review->engine-profile");

    // 6. engine-profile: accepted godot-4 decision (required for --require-manifest).
    writeEmbedded(path.join(runDir, "decisions", "0001-engine-profile.md"), "ADR 0001", engineDecision(ID));
    step(node("advance-run.mjs", ["--seed-id", ID, "--to", "decompose",
      "--event", "engine-decided", "--status", "passed",
      "--set", `engine_decision_path=.tgf/seeds/${ID}/decisions/0001-engine-profile.md`], dir),
      "advance engine-profile->decompose");

    // 7. decompose: SPEC.md from the fixture (seed_id already matches), then
    //    record the path on the exit transition.
    const spec = fs.readFileSync(rel("examples/fixtures/minimal-spec-decomposition.json"), "utf8");
    fs.writeFileSync(path.join(runDir, "SPEC.md"), `# SPEC.md\n\n\`\`\`json\n${spec}\n\`\`\`\n`);
    step(node("advance-run.mjs", ["--seed-id", ID, "--to", "handoff",
      "--event", "spec-decomposed", "--status", "passed",
      "--set", `spec_path=.tgf/seeds/${ID}/SPEC.md`], dir), "advance decompose->handoff");

    // 8. render the backlog, then the acceptance command itself.
    step(node("emit-local-issues.mjs", ["--seed-id", ID, "--write"], dir), "emit-local-issues --write");
    const pack = node("package-spec.mjs", ["--seed-id", ID, "--write", "--require-manifest"], dir);
    step(pack, "package-spec --write --require-manifest");
    assert.match(pack.stdout, /forge-manifest\.json emitted/);

    // The pack landed at the documented default root (games/_export-<id>
    // since DES-C; forge intake births games/<id>) and is verifier-clean.
    const packDir = path.join(dir, "games", `_export-${ID}`);
    const manifest = JSON.parse(fs.readFileSync(path.join(packDir, "forge-manifest.json"), "utf8"));
    assert.deepEqual(validate(contractsSchema, manifest), [], "pack forge-manifest must validate");
    const specFixture = JSON.parse(spec);
    assert.deepEqual(
      manifest.slices.map((s) => s.evidence_required),
      specFixture.slices.map((s) => s.evidence_requirements),
      "evidence_requirements must flow into the manifest as evidence_required"
    );
    for (const f of ["SPEC.md", "GAME_THESIS.md", "issues/tracer-loop.md", "issues/sunlight-pressure.md"]) {
      assert.ok(fs.existsSync(path.join(packDir, f)), `pack must contain ${f}`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("DES-B: the cold walk cleans up after itself (temp dirs only)", () => {
  assert.ok(lastWalkDir, "the cold-walk test must run first and record its temp dir");
  assert.ok(!fs.existsSync(lastWalkDir),
    `temp studio must be removed after the walk: ${lastWalkDir}`);
  assert.ok(!fs.existsSync(rel(".tgf", "seeds", ID)),
    "no run state may leak into the repo checkout (.tgf/seeds is gitignored run state)");
});
