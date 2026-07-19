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

function initializedRun(dir, id) {
  const result = node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir });
  assert.equal(result.status, 0, result.stderr);
  return rs.runDirFor(dir, id);
}

test("isValidSeedId accepts kebab ids and rejects junk", () => {
  assert.ok(rs.isValidSeedId("tiny-asteroid-gardening"));
  assert.ok(rs.isValidSeedId("a1"));
  assert.ok(!rs.isValidSeedId("Bad_ID"));
  assert.ok(!rs.isValidSeedId("-leading"));
  assert.ok(!rs.isValidSeedId("trailing-"));
  assert.ok(!rs.isValidSeedId("a"));
});

test("specPackRootFor defaults to $STUDIO_ROOT/games/{seed-id} (path-registry)", () => {
  const id = "pack-root-probe";
  const prev = process.env.STUDIO_ROOT;
  try {
    process.env.STUDIO_ROOT = "/tmp/fake-studio-root";
    assert.equal(rs.specPackRootFor(id), path.join("/tmp/fake-studio-root", "games", id));
    // Not the legacy tgf-games path
    assert.notEqual(rs.specPackRootFor(id), `/home/ark/tgf-games/${id}`);
  } finally {
    if (prev === undefined) delete process.env.STUDIO_ROOT;
    else process.env.STUDIO_ROOT = prev;
  }
  // Discovery from design repo cwd (no STUDIO_ROOT) lands under real studio/games
  const discovered = rs.specPackRootFor(id, REPO);
  assert.match(discovered, /[/\\]games[/\\]pack-root-probe$/);
  assert.ok(!discovered.includes("tgf-games"));
});

test("ALL_PHASES matches the seed-manifest current_phase enum", () => {
  const schema = JSON.parse(fs.readFileSync(rel("schemas/seed-manifest.schema.json"), "utf8"));
  const enumPhases = schema.properties.current_phase.enum;
  assert.deepEqual([...rs.ALL_PHASES].sort(), [...enumPhases].sort());
});

test("phase machine: legal spine transitions pass, illegal jumps fail", () => {
  assert.ok(rs.isLegalTransition("toolchain", "thesis"));
  assert.ok(rs.isLegalTransition("thesis", "design-review"));
  assert.ok(rs.isLegalTransition("design-review", "engine-profile")); // ADVANCE = design-lock
  assert.ok(rs.isLegalTransition("design-review", "deepen"));
  assert.ok(rs.isLegalTransition("deepen", "thesis")); // re-fertilize the idea
  assert.ok(rs.isLegalTransition("engine-profile", "decompose"));
  assert.ok(rs.isLegalTransition("decompose", "handoff"));
  assert.ok(rs.isLegalTransition("decompose", "decompose")); // re-entrant checkpoint
  assert.ok(rs.isLegalTransition("decompose", "blocked")); // any active phase may block
  assert.ok(rs.isLegalTransition("blocked", "decompose")); // resume from blocked

  assert.ok(!rs.isLegalTransition("thesis", "decompose")); // skips the design gate
  assert.ok(!rs.isLegalTransition("toolchain", "engine-profile"));
  assert.ok(!rs.isLegalTransition("deepen", "engine-profile")); // deepen must go through thesis
  assert.ok(!rs.isLegalTransition("killed", "decompose")); // terminal is absorbing
  assert.ok(!rs.isLegalTransition("complete", "handoff"));
});

test("ledgerTransitionErrors flags the first illegal hop only where it occurs", () => {
  const legal = [
    { phase: "toolchain" }, { phase: "toolchain" }, { phase: "thesis" }, { phase: "design-review" }
  ];
  assert.deepEqual(rs.ledgerTransitionErrors(legal), []);

  const illegal = [{ phase: "toolchain" }, { phase: "thesis" }, { phase: "handoff" }];
  const errs = rs.ledgerTransitionErrors(illegal);
  assert.equal(errs.length, 1, "only the first illegal hop should be flagged");
  assert.match(errs[0], /thesis -> handoff/);
});

test("phaseArtifactConstraintErrors enforces thesis/engine/spec paths strictly after their phase", () => {
  // toolchain: nothing required
  assert.deepEqual(rs.phaseArtifactConstraintErrors({ current_phase: "toolchain", game_thesis_path: null, engine_decision_path: null }), []);
  // thesis: still producing the thesis, not yet required
  assert.deepEqual(rs.phaseArtifactConstraintErrors({ current_phase: "thesis", game_thesis_path: null, engine_decision_path: null }), []);
  // design-review: past thesis -> thesis required; engine not yet
  const dr = rs.phaseArtifactConstraintErrors({ current_phase: "design-review", game_thesis_path: null, engine_decision_path: null });
  assert.equal(dr.length, 1, "design-review missing thesis must be the only violation");
  assert.match(dr[0], /game_thesis_path/);
  // decompose: past engine-profile -> engine required
  const dc = rs.phaseArtifactConstraintErrors({ current_phase: "decompose", game_thesis_path: "t.md", engine_decision_path: null });
  assert.equal(dc.length, 1, "decompose missing engine_decision_path must be the only violation");
  assert.match(dc[0], /engine_decision_path/);
  // handoff: past decompose -> spec required
  const ho = rs.phaseArtifactConstraintErrors({ current_phase: "handoff", game_thesis_path: "t.md", engine_decision_path: "d.md", spec_path: null });
  assert.equal(ho.length, 1, "handoff missing spec_path must be the only violation");
  assert.match(ho[0], /spec_path/);
  // fully populated downstream phase passes
  assert.deepEqual(rs.phaseArtifactConstraintErrors({ current_phase: "handoff", game_thesis_path: "t.md", engine_decision_path: "d.md", spec_path: "s.md" }), []);
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
    spec_path: `.tgf/seeds/${id}/SPEC.md`,
    default_spec_pack_root: rs.specPackRootFor(id),
    spec_pack_path: null,
    execution_ledger_path: `.tgf/seeds/${id}/execution-ledger.jsonl`,
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
    const specAbs = rs.manifestPathPolicyErrors({ ...manifest, spec_path: "/tmp/SPEC.md" }, id, dir);
    assert.match(specAbs.join("\n"), /spec_path must resolve inside/);
    const pack = rs.manifestPathPolicyErrors({ ...manifest, spec_pack_path: "/tmp/not-the-spec-pack" }, id, dir);
    assert.match(pack.join("\n"), /spec_pack_path must resolve inside/);
    const outside = tmp();
    fs.symlinkSync(outside, path.join(runDir, "linked"));
    const linked = rs.manifestPathPolicyErrors({ ...manifest, game_thesis_path: `.tgf/seeds/${id}/linked/GAME_THESIS.md` }, id, dir);
    assert.match(linked.join("\n"), /game_thesis_path must not traverse symlink/);
    const linkedReports = rs.manifestPathPolicyErrors({
      ...manifest,
      review_report_paths: [`.tgf/seeds/${id}/linked/depth-vector.json`],
      handoff_paths: [`.tgf/seeds/${id}/linked/handoff.md`]
    }, id, dir);
    assert.match(linkedReports.join("\n"), /review_report_paths\[0\] must not traverse symlink/);
    assert.match(linkedReports.join("\n"), /handoff_paths\[0\] must not traverse symlink/);
    fs.rmSync(outside, { recursive: true, force: true });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("questionBudgetErrors enforces lane budgets before the spec is decomposed", () => {
  const q = (n) => Array.from({ length: n }, (_, i) => ({ question: `q${i}`, recommended_default: "d", phase_asked: "thesis" }));
  const lane = (mode) => ({ mode, stop_line: "pack", origination: "user" });
  assert.deepEqual(rs.questionBudgetErrors({ current_phase: "thesis", questions_asked: q(1) }), []);
  assert.ok(rs.questionBudgetErrors({ current_phase: "thesis", questions_asked: q(2) }).length > 0);
  assert.ok(rs.questionBudgetErrors({ current_phase: "decompose", questions_asked: q(2) }).length > 0);
  assert.ok(rs.questionBudgetErrors({ current_phase: "intake", questions_asked: q(2) }).length > 0); // intake is the default question site
  assert.ok(rs.questionBudgetErrors({ current_phase: "toolchain", questions_asked: q(2) }).length > 0);
  assert.deepEqual(rs.questionBudgetErrors({ current_phase: "intake", questions_asked: q(1) }), []);
  assert.deepEqual(rs.questionBudgetErrors({ current_phase: "intake", design_lane: lane("grill"), questions_asked: q(1) }), []);
  assert.ok(rs.questionBudgetErrors({ current_phase: "intake", design_lane: lane("yolo"), questions_asked: q(1) }).length > 0);
  assert.deepEqual(rs.questionBudgetErrors({ current_phase: "intake", design_lane: lane("yolo"), questions_asked: [] }), []);
  assert.deepEqual(rs.questionBudgetErrors({ current_phase: "handoff", questions_asked: q(5) }), []); // spec already cut
  assert.deepEqual(rs.questionBudgetErrors({ current_phase: "handoff", design_lane: lane("yolo"), questions_asked: q(5) }), []);
  assert.deepEqual(rs.questionBudgetErrors({ current_phase: "decompose" }), []); // no field -> 0
});

test("deepenAttemptErrors enforces the 2-attempt deepen cap", () => {
  assert.deepEqual(rs.deepenAttemptErrors({ current_phase: "deepen", deepen_attempt_count: 2 }), []);
  assert.ok(rs.deepenAttemptErrors({ current_phase: "deepen", deepen_attempt_count: 3 }).length > 0);
  assert.deepEqual(rs.deepenAttemptErrors({ current_phase: "killed", deepen_attempt_count: 3 }), []);
});

test("designLaneConsistencyErrors accepts an anchored lane and a prior owner-authorized change", () => {
  const anchored = { mode: "yolo", stop_line: "design-lock", origination: "user" };
  const changed = { mode: "yolo", stop_line: "pack", origination: "user" };
  const lane = (value) => `design_lane:${JSON.stringify(value)}`;
  assert.deepEqual(rs.designLaneConsistencyErrors({ design_lane: anchored }, [
    { event: "run-initialized", lane: lane(anchored) }
  ]), []);
  assert.deepEqual(rs.designLaneConsistencyErrors({ design_lane: changed }, [
    { event: "run-initialized", lane: lane(anchored) },
    { event: "lane-changed", status: "passed", actor: "Shane", lane: lane(changed) },
    { phase: "decompose", event: "phase-advance" }
  ]), []);
});

test("designLaneConsistencyErrors rejects malformed anchors and unauthorized or retroactive changes", () => {
  const anchored = { mode: "yolo", stop_line: "design-lock", origination: "user" };
  const changed = { mode: "yolo", stop_line: "pack", origination: "user" };
  const lane = (value) => `design_lane:${JSON.stringify(value)}`;
  assert.match(rs.designLaneConsistencyErrors({ design_lane: anchored }, [
    { event: "run-initialized", lane: "design_lane:{bad" }
  ]).join("\n"), /anchor is invalid JSON/);
  assert.match(rs.designLaneConsistencyErrors({ design_lane: changed }, [
    { event: "run-initialized", lane: lane(anchored) },
    { event: "lane-changed", status: "passed", actor: "agent", lane: lane(changed) }
  ]).join("\n"), /drifted from the run-initialized ledger anchor/);
  assert.match(rs.designLaneConsistencyErrors({ design_lane: changed }, [
    { event: "run-initialized", lane: lane(anchored) },
    { phase: "decompose", event: "phase-advance" },
    { event: "lane-changed", status: "passed", actor: "Shane", lane: lane(changed) }
  ]).join("\n"), /drifted from the run-initialized ledger anchor/);
});

test("designLaneConsistencyErrors requires a Shane release before the first downstream crossing", () => {
  const manifest = { design_lane: { mode: "yolo", stop_line: "design-lock", origination: "user" } };
  const rows = [
    { phase: "engine-profile", event: "phase-advance", status: "passed", actor: "agent" },
    { phase: "decompose", event: "phase-advance", status: "passed", actor: "agent" }
  ];
  assert.match(rs.designLaneConsistencyErrors(manifest, rows).join("\n"), /forbids progress past engine-profile/);
  assert.deepEqual(rs.designLaneConsistencyErrors(manifest, [
    rows[0],
    { phase: "engine-profile", event: "stop-line-released", status: "passed", actor: "Shane" },
    rows[1]
  ]), []);
  assert.match(rs.designLaneConsistencyErrors(manifest, [
    ...rows,
    { phase: "engine-profile", event: "stop-line-released", status: "passed", actor: "Shane" }
  ]).join("\n"), /forbids progress past engine-profile/);
});

test("openRun returns one validated snapshot with derived ledger and export truth", () => {
  const dir = tmp();
  const id = "rs-open";
  try {
    initializedRun(dir, id);
    const run = rs.openRun(dir, id);
    assert.equal(run.manifest.current_phase, "intake");
    assert.equal(run.ledgerRows.length, 1);
    assert.equal(run.latestEvent.event, "run-initialized");
    assert.deepEqual(run.phase, {
      current: "intake",
      terminal: false,
      legal_next: ["toolchain", "blocked", "failed", "killed"]
    });
    assert.deepEqual(run.exportStatus, { kind: "none", revision_count: 0, path: null });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("openRun rejects manifest/ledger disagreement as a single run error", () => {
  const dir = tmp();
  const id = "rs-open-mismatch";
  try {
    const runDir = initializedRun(dir, id);
    const manifestPath = path.join(runDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.current_phase = "toolchain";
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    assert.throws(() => rs.openRun(dir, id), /current_phase 'toolchain' != latest ledger phase 'intake'/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("advanceRun rolls back the ledger when manifest persistence fails", () => {
  const dir = tmp();
  const id = "rs-advance-rollback";
  try {
    const runDir = initializedRun(dir, id);
    const manifestPath = path.join(runDir, "manifest.json");
    const ledgerPath = path.join(runDir, "execution-ledger.jsonl");
    const manifestBefore = fs.readFileSync(manifestPath, "utf8");
    const ledgerBefore = fs.readFileSync(ledgerPath, "utf8");
    assert.throws(() => rs.advanceRun(dir, id, {
      to: "blocked", event: "injected-failure", status: "blocked", actor: "test"
    }, {
      now: "2026-07-19T12:00:00.000Z",
      persistence: { writeManifest() { throw new Error("injected manifest failure"); } }
    }), /injected manifest failure/);
    assert.equal(fs.readFileSync(manifestPath, "utf8"), manifestBefore);
    assert.equal(fs.readFileSync(ledgerPath, "utf8"), ledgerBefore);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("advanceRun preserves a valid ledger that lacks a trailing newline", () => {
  const dir = tmp();
  const id = "rs-advance-no-newline";
  try {
    const runDir = initializedRun(dir, id);
    const ledgerPath = path.join(runDir, "execution-ledger.jsonl");
    fs.writeFileSync(ledgerPath, fs.readFileSync(ledgerPath, "utf8").trimEnd());
    rs.advanceRun(dir, id, {
      to: "blocked", event: "operator-blocked", status: "blocked", actor: "test"
    }, { now: "2026-07-19T12:00:00.000Z" });
    const run = rs.openRun(dir, id);
    assert.equal(run.ledgerRows.length, 2);
    assert.equal(run.latestEvent.event, "operator-blocked");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("advanceRun leaves durable repair evidence when manifest write and ledger rollback fail", () => {
  const dir = tmp();
  const id = "rs-advance-repair";
  try {
    initializedRun(dir, id);
    assert.throws(() => rs.advanceRun(dir, id, {
      to: "intake", event: "same-phase-checkpoint", status: "checkpointed", actor: "test"
    }, {
      now: "2026-07-19T12:00:00.000Z",
      persistence: {
        writeManifest() { throw new Error("injected manifest failure"); },
        restoreLedger() { throw new Error("injected rollback failure"); }
      }
    }), /ledger rollback failed/);
    assert.throws(() => rs.openRun(dir, id), /pending run-state transaction requires repair/);
    const transactionPath = path.join(dir, ".tgf", "seeds", id, "run-state-transaction.json");
    const transaction = JSON.parse(fs.readFileSync(transactionPath, "utf8"));
    assert.equal(transaction.manifest_before.current_phase, "intake");
    assert.equal(transaction.manifest_after.resume_point.reason, "advanced intake -> intake (same-phase-checkpoint)");
    assert.match(transaction.ledger_before, /run-initialized/);
    const validation = node("validate-artifacts.mjs", ["--check", "run", "--seed-id", id], { cwd: dir });
    assert.equal(validation.status, 1, validation.stdout + validation.stderr);
    assert.match(validation.stdout, /pending run-state transaction requires repair/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("readLedger is crash-safe: a malformed line is skipped and reported", () => {
  const dir = tmp();
  try {
    const runDir = rs.runDirFor(dir, "x");
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, "execution-ledger.jsonl"),
      `${JSON.stringify({ phase: "toolchain", event: "a" })}\n{ this is not json\n${JSON.stringify({ phase: "toolchain", event: "b" })}\n`);
    const { rows, parseErrors } = rs.readLedger(runDir);
    assert.equal(rows.length, 2, "malformed line must be skipped from parsed rows");
    assert.equal(parseErrors.length, 1, "the one malformed line must be reported");
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
    assert.match(r.stdout, /phase:\s+intake/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("summarize-run reports revision exports instead of '(none — not exported)'", () => {
  // spec_pack_path stays null for --revise-of exports (path policy: only the
  // default root is recordable), so the summary must derive the revision-export
  // state from the ledger instead of contradicting it.
  const dir = tmp();
  const id = "rs-summary-revision";
  try {
    assert.equal(node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status, 0);
    const runDir = path.join(dir, ".tgf", "seeds", id);
    const manifestPath = path.join(runDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.current_phase = "complete";
    manifest.game_thesis_path = `.tgf/seeds/${id}/GAME_THESIS.md`;
    manifest.engine_decision_path = `.tgf/seeds/${id}/decisions/0001-engine-profile.md`;
    manifest.spec_path = `.tgf/seeds/${id}/SPEC.md`;
    manifest.resume_point = {
      phase: "complete", artifact_path: `.tgf/seeds/${id}/SPEC.md`, reason: "revision exported"
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    const ledgerPath = path.join(dir, ".tgf", "seeds", id, "execution-ledger.jsonl");
    const phaseRows = ["toolchain", "thesis", "design-review", "engine-profile", "decompose", "handoff", "complete"]
      .map((phase) => ({
        ts: new Date().toISOString(), seed_id: id, phase,
        event: "phase-advance", status: "passed", actor: "test"
      }));
    const revisionRow = {
      ts: new Date().toISOString(), seed_id: id, phase: "complete",
      event: "spec-pack-revision-exported", status: "passed", actor: "package-spec.mjs"
    };
    fs.appendFileSync(ledgerPath, [...phaseRows, revisionRow].map(JSON.stringify).join("\n") + "\n");
    const r = node("summarize-run.mjs", ["--seed-id", id], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /\(none — not exported\)/);
    assert.match(r.stdout, /spec pack:\s+\(revision-exported to existing game dir — 1 ledger row\)/);
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
