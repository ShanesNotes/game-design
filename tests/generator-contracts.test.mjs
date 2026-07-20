import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPTH_AXES } from "../scripts/lib/portfolio-memory.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function run(script, args, cwd) {
  return spawnSync(process.execPath, [path.join(REPO, "scripts", script), ...args], {
    cwd,
    encoding: "utf8"
  });
}

// A design-locked run fixture: validated thesis + gate-passing ADVANCE depth
// vector; only reviews/ANTI_BORING_VERDICT.md varies between cases.
function designLockedRun(dir, id) {
  assert.equal(run("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], dir).status, 0);
  const runDir = path.join(dir, ".tgf", "seeds", id);
  const thesis = JSON.parse(fs.readFileSync(path.join(REPO, "examples/fixtures/minimal-game-thesis.json"), "utf8"));
  thesis.schema_version = "2.0.0";
  thesis.portfolio_distinctness = {
    nearest_prior_seed: "prior-one",
    falsifying_difference: "The water move removes a route before rotation.",
    digest_generated_at: "2026-07-12T12:00:00.000Z"
  };
  fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"),
    `# Artifact\n\n\`\`\`json\n${JSON.stringify(thesis, null, 2)}\n\`\`\`\n`);
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
  const vector = {
    schema_version: "2.0.0",
    scores,
    total: Object.values(scores).reduce((sum, score) => sum + score, 0),
    register: "mechanics-first",
    evidence: Object.fromEntries(DEPTH_AXES.map((axis) => [axis, "depth_mechanisms[0]"])),
    review_provenance: { mode: "independent", reviewer_note: "fixture" },
    verdict: "ADVANCE"
  };
  fs.writeFileSync(path.join(runDir, "reviews", "depth-vector.json"), JSON.stringify(vector, null, 2) + "\n");
  return runDir;
}

test("generate-g1-brief accepts both P07 verdict-line forms and stays loud on the rest", () => {
  const dir = tmp("g1-verdict-");
  const id = "g1-verdict-test";
  try {
    const runDir = designLockedRun(dir, id);
    const verdictPath = path.join(runDir, "reviews", "ANTI_BORING_VERDICT.md");
    const briefPath = path.join(runDir, "reviews", "G1_BRIEF.md");
    // The thesis names a nearest prior seed, so the run check requires a
    // distinctness disposition line alongside whatever verdict form is tested.
    const disposition = "Distinctness: prior-one remains falsified by route removal.\n";
    const attempt = (content) => {
      if (content === null) fs.rmSync(verdictPath, { force: true });
      else fs.writeFileSync(verdictPath, content + disposition);
      fs.rmSync(briefPath, { force: true });
      return run("generate-g1-brief.mjs", ["--seed-id", id], dir);
    };

    // Contract form 1: literal `VERDICT: <RULING>` line.
    let result = attempt("VERDICT: ADVANCE\n");
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(fs.readFileSync(briefPath, "utf8"), /Verdict: ADVANCE\./);

    // Contract form 2: `## Verdict` heading followed by the bold ruling.
    result = attempt("## Findings\n\nPer-axis citations.\n\n## Verdict\n\n**ADVANCE**\n");
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(fs.readFileSync(briefPath, "utf8"), /Verdict: ADVANCE\./);

    // Every other ruling token must parse as that ruling, not as ADVANCE.
    for (const ruling of ["DEEPEN", "KILL"]) {
      result = attempt(`## Verdict\n\n**${ruling}**\n`);
      assert.equal(result.status, 1, `${ruling}: ` + result.stdout + result.stderr);
      assert.match(result.stderr, /missing an ADVANCE verdict/);
      assert.ok(!fs.existsSync(briefPath));
    }

    // Malformed or absent verdict: loud failure, never a silent pass.
    result = attempt("## Verdict\n\nThe design should advance.\n");
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /missing an ADVANCE verdict/);
    assert.ok(!fs.existsSync(briefPath));

    result = attempt(null);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /ERROR/);
    assert.ok(!fs.existsSync(briefPath));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("verify-local-tools refreshes the default ledger and probes kimi, not grok-build", () => {
  const dir = tmp("tools-probe-");
  try {
    const result = run("verify-local-tools.mjs", [], dir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const probe = JSON.parse(fs.readFileSync(path.join(dir, ".factory", "local_tool_probe.json"), "utf8"));
    const commands = probe.results.map((r) => r.command);
    assert.ok(commands.includes("kimi --version"), "kimi probe must be present");
    assert.ok(!commands.some((command) => command.includes("grok-build")), "grok-build probe must be gone");
    const ledger = fs.readFileSync(path.join(dir, "docs", "toolchain-verification-ledger.md"), "utf8");
    assert.match(ledger, /<!-- TGF:PROBE:START -->/);
    assert.match(ledger, /`kimi --version`/);
    assert.doesNotMatch(ledger, /grok-build/);
    assert.match(result.stderr, /refreshed generated probe block/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("verify-local-tools fails loudly on a bare --write and keeps hand-written rows", () => {
  const dir = tmp("tools-probe-");
  try {
    let result = run("verify-local-tools.mjs", ["--write"], dir);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /--write requires/);

    const ledgerPath = path.join(dir, "ledger", "custom.md");
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    fs.writeFileSync(ledgerPath, "# Custom ledger\n\nhand-written row stays\n");
    result = run("verify-local-tools.mjs", ["--write", ledgerPath], dir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const ledger = fs.readFileSync(ledgerPath, "utf8");
    assert.match(ledger, /hand-written row stays/);
    assert.match(ledger, /<!-- TGF:PROBE:START -->/);
    assert.match(ledger, /`kimi --version`/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
