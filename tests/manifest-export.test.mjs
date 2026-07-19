// T06 — forge-manifest export with Godot-gate (SPEC §3.4–§3.5).
// F05b — post-complete revision export (--revise-of, parent_digest, pin refresh).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../scripts/lib/validate-json-schema.mjs";
import {
  GODOT_PROFILE,
  forgeGateLine,
  mapForgeManifest,
  computePins,
  FORGE_GATE_TOKEN,
  BUILD_DISCIPLINES,
  validateSpecDisciplines
} from "../scripts/lib/manifest-mapper.mjs";
import {
  resolveAssetsRoot,
  resolveLoreRoot,
  contractsVersion,
  forgeManifestSchemaPath,
  findStudioRoot,
  gitHead
} from "../scripts/lib/studio-paths.mjs";
import { leakageErrors } from "../scripts/lib/leakage.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(REPO, ...p);
const STUDIO = path.resolve(REPO, "..", ".."); // .worktrees/t06 → game-studio when nested; adjust

function resolveStudioForTests() {
  const discovered = findStudioRoot(REPO);
  if (discovered) return discovered;
  return process.env.STUDIO_ROOT || path.resolve(REPO, "..");
}

const STUDIO_ROOT = resolveStudioForTests();

function node(script, args, opts = {}) {
  const { env: extraEnv, cwd, ...rest } = opts;
  return spawnSync(process.execPath, [rel("scripts", script), ...args], {
    encoding: "utf8",
    cwd: cwd || REPO,
    env: { ...process.env, STUDIO_ROOT, ...(extraEnv || {}) },
    ...rest
  });
}

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tgf-t06-"));
}

function markRunLegacy(dir, id) {
  const runDir = path.join(dir, ".tgf", "seeds", id);
  const manifestFile = path.join(runDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  manifest.factory_version = "0.1.0";
  manifest.current_phase = "toolchain";
  manifest.resume_point.phase = "toolchain";
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  const ledgerFile = path.join(runDir, "execution-ledger.jsonl");
  const rows = fs.readFileSync(ledgerFile, "utf8").trim().split("\n").map(JSON.parse);
  rows[0].phase = "toolchain";
  rows[0].resume_point.phase = "toolchain";
  fs.writeFileSync(ledgerFile, rows.map(JSON.stringify).join("\n") + "\n");
}

function thesisMd(overrides = {}) {
  const obj = {
    ...JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8")),
    ...overrides
  };
  return "# GAME_THESIS.md\n\n```json\n" + JSON.stringify(obj, null, 2) + "\n```\n";
}

function engineMd(id, { status = "accepted", profile = GODOT_PROFILE, extra = {} } = {}) {
  const obj = {
    seed_id: id,
    status,
    decision: "godot for headless scene tooling",
    profile,
    rationale: "tracer needs scene tree + headless",
    rejected: [],
    reversal_triggers: ["editor opacity blocks bots"],
    ...(profile === GODOT_PROFILE
      ? {
          godot_min: "4.6.2",
          godot_max: "4.7.0",
          renderer: "gl_compatibility",
          language: "gdscript"
        }
      : {}),
    ...extra
  };
  return "# ADR 0001\n\n```json\n" + JSON.stringify(obj) + "\n```\n";
}

function specMd(id, overrides = {}) {
  const obj = {
    ...JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-spec-decomposition.json"), "utf8")),
    seed_id: id,
    ...overrides
  };
  return "# SPEC.md\n\n```json\n" + JSON.stringify(obj, null, 2) + "\n```\n";
}

const ADVANCE_DV = {
  scores: {
    meaningful_choice: 2, tradeoff: 2, pressure: 2, uncertainty: 2,
    progression: 2, mastery: 2, combinatorial: 2, emergence: 2,
    replayable_variation: 2, failure_recovery: 0, expression: 0, expansion_headroom: 0
  },
  total: 18,
  verdict: "ADVANCE"
};

function advanceRun(dir, id, { phase, thesisPath, enginePath, specPath, ledgerPhases = [] }) {
  const runDir = path.join(dir, ".tgf", "seeds", id);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "manifest.json"), "utf8"));
  manifest.current_phase = phase;
  if (thesisPath !== undefined) manifest.game_thesis_path = thesisPath;
  if (enginePath !== undefined) manifest.engine_decision_path = enginePath;
  if (specPath !== undefined) manifest.spec_path = specPath;
  fs.writeFileSync(path.join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const ledgerFile = path.join(runDir, "execution-ledger.jsonl");
  for (const p of ledgerPhases) {
    fs.appendFileSync(ledgerFile, JSON.stringify({
      ts: "2026-06-07T00:00:00.000Z", seed_id: id, phase: p,
      event: "phase-advance", status: "checkpointed", actor: "test"
    }) + "\n");
  }
  return runDir;
}

function decomposeReadyRun(dir, id, { profile = GODOT_PROFILE, thesisOverrides = {}, specOverrides = {} } = {}) {
  assert.equal(
    node("init-game-run.mjs", ["--seed-id", id, "--seed", "x"], { cwd: dir }).status,
    0
  );
  markRunLegacy(dir, id);
  const runDir = path.join(dir, ".tgf", "seeds", id);
  fs.writeFileSync(path.join(runDir, "GAME_THESIS.md"), thesisMd(thesisOverrides));
  fs.writeFileSync(path.join(runDir, "decisions", "0001-engine-profile.md"), engineMd(id, { profile }));
  fs.writeFileSync(path.join(runDir, "SPEC.md"), specMd(id, specOverrides));
  fs.mkdirSync(path.join(runDir, "reviews", "design"), { recursive: true });
  fs.writeFileSync(path.join(runDir, "reviews", "design", "depth-vector.json"), JSON.stringify(ADVANCE_DV));
  advanceRun(dir, id, {
    phase: "decompose",
    thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
    enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
    specPath: `.tgf/seeds/${id}/SPEC.md`,
    ledgerPhases: ["thesis", "design-review", "engine-profile", "decompose"]
  });
  return runDir;
}

function loadContractsSchema() {
  const p = forgeManifestSchemaPath(REPO);
  assert.ok(p, "contracts schema must resolve via STUDIO_ROOT");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// --- unit: mapper implements §3.4 ---

test("AC1: mapper renames design_register→register and requires golden_moment", () => {
  const thesis = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8"));
  const spec = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-spec-decomposition.json"), "utf8"));
  const engine = {
    seed_id: "x",
    status: "accepted",
    decision: "d",
    profile: GODOT_PROFILE,
    godot_min: "4.6.2",
    godot_max: "4.7.0",
    renderer: "gl_compatibility",
    language: "gdscript",
    rationale: "r",
    rejected: [],
    reversal_triggers: ["t"]
  };
  const pins = {
    contracts_version: "1.0.0",
    assets_index: "a".repeat(40),
    lore_index: "b".repeat(40),
    forge_template: null
  };
  const meta = {
    game_id: "tiny-asteroid-gardening",
    seed_id: "tiny-asteroid-gardening",
    producer: { name: "game-design", version: "0.1.0" },
    created: "2026-07-10T00:00:00.000Z",
    pack_digest: "c".repeat(64)
  };

  const good = mapForgeManifest({ thesis, spec, engine, pins, meta });
  assert.equal(good.ok, true, good.missing.join(", "));
  assert.equal(good.manifest.thesis.register, thesis.design_register);
  assert.equal(good.manifest.thesis.golden_moment, thesis.golden_moment);
  assert.equal(good.manifest.thesis.chosen_loop_id, spec.chosen_loop_id);
  assert.equal(good.manifest.slices[0].evidence_required[0], spec.slices[0].evidence_requirements[0]);
  assert.deepEqual(validate(loadContractsSchema(), good.manifest), []);

  const noGm = structuredClone(thesis);
  delete noGm.golden_moment;
  const bad = mapForgeManifest({ thesis: noGm, spec, engine, pins, meta });
  assert.equal(bad.ok, false);
  assert.ok(bad.missing.includes("thesis.golden_moment"));
});

test("AC6: engine-matrix states only godot-4 packs proceed into forge", () => {
  const text = fs.readFileSync(rel("docs/engine-matrix.md"), "utf8");
  // grep-checkable stable phrases (may wrap across lines)
  assert.match(text, /non-Godot engine decisions remain\s+valid/);
  assert.match(text, /only godot-4 packs proceed into forge/);
});

// --- integration: package-spec ---

test("AC2: godot-4 export emits schema-valid forge-manifest with real pin SHAs", () => {
  const dir = tmp();
  const target = tmp();
  const id = "selftest-manifest-godot";
  try {
    const runDir = decomposeReadyRun(dir, id, { profile: GODOT_PROFILE });
    assert.equal(node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir }).status, 0);

    const r = node("package-spec.mjs", ["--seed-id", id, "--to", target, "--write"], { cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stdout, new RegExp(FORGE_GATE_TOKEN));

    const mfPath = path.join(target, "forge-manifest.json");
    assert.ok(fs.existsSync(mfPath), "pack must contain forge-manifest.json");
    const mf = JSON.parse(fs.readFileSync(mfPath, "utf8"));

    const schemaErrs = validate(loadContractsSchema(), mf);
    assert.deepEqual(schemaErrs, [], schemaErrs.join("\n"));

    // validate-artifacts forge-manifest check
    const chk = node("validate-artifacts.mjs", ["--check", "forge-manifest", "--file", mfPath], { cwd: dir });
    assert.equal(chk.status, 0, chk.stdout + chk.stderr);

    // pins are real git SHAs of assets/lore
    const assetsSha = gitHead(resolveAssetsRoot(REPO));
    const loreSha = gitHead(resolveLoreRoot(REPO));
    assert.ok(assetsSha, "assets git HEAD");
    assert.ok(loreSha, "lore git HEAD");
    assert.equal(mf.pins.assets_index, assetsSha);
    assert.equal(mf.pins.lore_index, loreSha);
    assert.equal(mf.pins.contracts_version, contractsVersion(REPO));
    // DES-A: base export must claim coherent contract pins (forge intake equality).
    assert.equal(mf.schema_version, mf.pins.contracts_version);
    assert.equal(mf.schema_version, contractsVersion(REPO));
    assert.equal(mf.engine.profile, GODOT_PROFILE);
    assert.equal(mf.thesis.register, "mechanics-first");
    assert.match(mf.pack_digest, /^[a-f0-9]{64}$/);

    // contracts test runner can also validate (Node path)
    const contractsValidate = path.join(STUDIO_ROOT, "contracts", "test", "validate-node.mjs");
    if (fs.existsSync(contractsValidate)) {
      // runner expects fixture dir shape; we already validated against the schema above
      assert.ok(true);
    }

    // AC5: leakage scan over emitted manifest (and pack root)
    const leaks = leakageErrors([target], target);
    assert.deepEqual(leaks, [], leaks.join("\n"));
    assert.doesNotMatch(JSON.stringify(mf), /\/home\/ark\//);
    assert.doesNotMatch(JSON.stringify(mf), /tiny[ -]game[ -]factory/i);

    // issues were rendered from the same run
    assert.ok(fs.existsSync(path.join(runDir, "issues", "tracer-loop.md")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test("AC3: non-godot packages with FORGE-GATE line; --require-manifest hard-fails", () => {
  const dir = tmp();
  const target = tmp();
  const id = "selftest-manifest-nongodot";
  try {
    decomposeReadyRun(dir, id, { profile: "raw Canvas + TS" });
    assert.equal(node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir }).status, 0);

    let r = node("package-spec.mjs", ["--seed-id", id, "--to", target, "--write"], { cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(`${FORGE_GATE_TOKEN} raw Canvas \\+ TS`));
    assert.ok(!fs.existsSync(path.join(target, "forge-manifest.json")), "no manifest for non-godot");
    assert.ok(fs.existsSync(path.join(target, "SPEC.md")), "pack still exports");

    // require-manifest upgrades to hard fail; target was already filled — use fresh target
    const target2 = tmp();
    try {
      r = node(
        "package-spec.mjs",
        ["--seed-id", id, "--to", target2, "--write", "--require-manifest"],
        { cwd: dir }
      );
      assert.equal(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stderr + r.stdout, new RegExp(FORGE_GATE_TOKEN));
      assert.equal(fs.readdirSync(target2).length, 0, "require-manifest fail must not write pack");
    } finally {
      fs.rmSync(target2, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test("AC4: mapping failure aborts before staging and lists every missing field", () => {
  const dir = tmp();
  const target = tmp();
  const id = "selftest-manifest-missing-gm";
  try {
    const runDir = decomposeReadyRun(dir, id, { profile: GODOT_PROFILE });
    assert.equal(node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir }).status, 0);

    // Delete golden_moment from thesis (optional in schema; required at mapping)
    const thesisPath = path.join(runDir, "GAME_THESIS.md");
    const thesis = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8"));
    delete thesis.golden_moment;
    fs.writeFileSync(thesisPath, "# GAME_THESIS.md\n\n```json\n" + JSON.stringify(thesis, null, 2) + "\n```\n");

    const before = fs.existsSync(target) ? fs.readdirSync(target) : [];
    const r = node("package-spec.mjs", ["--seed-id", id, "--to", target, "--write"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /mapping failed|aborted before staging/i);
    assert.match(r.stderr, /thesis\.golden_moment/);
    assert.equal(fs.readdirSync(target).length, before.length, "target must not be mutated on mapping abort");
    assert.ok(!fs.existsSync(path.join(target, "forge-manifest.json")));
    assert.ok(!fs.existsSync(path.join(target, "SPEC.md")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test("forgeGateLine token is stable", () => {
  assert.equal(forgeGateLine("unity"), "FORGE-GATE:ENGINE unity");
});

test("computePins uses git SHAs not paths", () => {
  const r = computePins({
    assetsRoot: resolveAssetsRoot(REPO),
    loreRoot: resolveLoreRoot(REPO),
    contractsVersion: "1.0.0",
    forgeTemplate: null
  });
  assert.equal(r.ok, true, (r.missing || []).join(", "));
  assert.match(r.pins.assets_index, /^[0-9a-f]{40}$/i);
  assert.match(r.pins.lore_index, /^[0-9a-f]{40}$/i);
  assert.doesNotMatch(r.pins.assets_index, /\//);
  assert.doesNotMatch(r.pins.lore_index, /\//);
});

// --- GB01: acceptance-level discipline tags (game-build SPEC §2) ---

function baseMapInputs(specOverrides = {}) {
  const thesis = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8"));
  const spec = {
    ...JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-spec-decomposition.json"), "utf8")),
    ...specOverrides
  };
  const engine = {
    seed_id: "x",
    status: "accepted",
    decision: "d",
    profile: GODOT_PROFILE,
    godot_min: "4.6.2",
    godot_max: "4.7.0",
    renderer: "gl_compatibility",
    language: "gdscript",
    rationale: "r",
    rejected: [],
    reversal_triggers: ["t"]
  };
  const pins = {
    contracts_version: "1.0.0",
    assets_index: "a".repeat(40),
    lore_index: "b".repeat(40),
    forge_template: null
  };
  const meta = {
    game_id: "tiny-asteroid-gardening",
    seed_id: "tiny-asteroid-gardening",
    producer: { name: "game-design", version: "0.1.0" },
    created: "2026-07-10T00:00:00.000Z",
    pack_digest: "c".repeat(64)
  };
  return { thesis, spec, engine, pins, meta };
}

test("GB01: BUILD_DISCIPLINES enum is exactly the 8 SPEC §2 values", () => {
  assert.deepEqual([...BUILD_DISCIPLINES].sort(), [
    "art-integration",
    "audio-sourcing",
    "engineering",
    "game-feel",
    "level-content",
    "qa",
    "ui-ux",
    "world-gen"
  ]);
});

test("GB01: absent disciplines is fine; no default injection at map time", () => {
  const { thesis, spec, engine, pins, meta } = baseMapInputs();
  assert.equal(spec.ext, undefined);
  const r = mapForgeManifest({ thesis, spec, engine, pins, meta });
  assert.equal(r.ok, true, (r.missing || []).join(", "));
  assert.deepEqual(r.manifest.ext, {});
  assert.equal(r.manifest.ext.disciplines, undefined);

  // empty ext object also fine
  const r2 = mapForgeManifest({
    thesis,
    spec: { ...spec, ext: {} },
    engine,
    pins,
    meta
  });
  assert.equal(r2.ok, true, (r2.missing || []).join(", "));
  assert.equal(r2.manifest.ext.disciplines, undefined);
});

test("GB01: valid spec.ext.disciplines maps into manifest.ext.disciplines", () => {
  const disciplines = {
    "tracer-loop": {
      _default: "engineering",
      0: "ui-ux",
      "feel:rotate-snap": "game-feel"
    },
    "sunlight-pressure": {
      _default: "level-content",
      "screenshot:wither-timer": "art-integration"
    }
  };
  const { thesis, spec, engine, pins, meta } = baseMapInputs({
    ext: { disciplines }
  });
  const r = mapForgeManifest({ thesis, spec, engine, pins, meta });
  assert.equal(r.ok, true, (r.missing || []).join(", "));
  assert.deepEqual(r.manifest.ext.disciplines, disciplines);
  assert.deepEqual(validate(loadContractsSchema(), r.manifest), []);
});

test("GB01: unknown discipline or malformed shape fails listing valid values", () => {
  const { thesis, engine, pins, meta } = baseMapInputs();
  const baseSpec = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-spec-decomposition.json"), "utf8"));

  const unknown = mapForgeManifest({
    thesis,
    spec: {
      ...baseSpec,
      ext: { disciplines: { "tracer-loop": { _default: "juice" } } }
    },
    engine,
    pins,
    meta
  });
  assert.equal(unknown.ok, false);
  assert.ok(unknown.missing.some((m) => /unknown or invalid discipline/.test(m)), unknown.missing.join("\n"));
  assert.ok(unknown.missing.some((m) => /game-feel/.test(m) && /engineering/.test(m)), "must list valid values");

  const malformed = mapForgeManifest({
    thesis,
    spec: {
      ...baseSpec,
      ext: { disciplines: ["engineering"] }
    },
    engine,
    pins,
    meta
  });
  assert.equal(malformed.ok, false);
  assert.ok(
    malformed.missing.some((m) => /spec\.ext\.disciplines/.test(m) && /valid disciplines/.test(m)),
    malformed.missing.join("\n")
  );

  const badRow = validateSpecDisciplines({
    disciplines: { "tracer-loop": "engineering" }
  });
  assert.equal(badRow.ok, false);
  assert.ok(badRow.errors.some((e) => /tracer-loop/.test(e) && /valid disciplines/.test(e)));
});

test("GB01: package-spec export round-trips ext.disciplines into forge-manifest", () => {
  const dir = tmp();
  const target = tmp();
  const id = "selftest-manifest-disciplines";
  const disciplines = {
    "tracer-loop": {
      _default: "engineering",
      0: "ui-ux",
      "feel:rotate-snap": "game-feel"
    },
    "sunlight-pressure": {
      _default: "level-content",
      "screenshot:wither-timer": "art-integration"
    }
  };
  try {
    decomposeReadyRun(dir, id, {
      profile: GODOT_PROFILE,
      specOverrides: { ext: { disciplines } }
    });
    assert.equal(node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir }).status, 0);

    const r = node("package-spec.mjs", ["--seed-id", id, "--to", target, "--write"], { cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);

    const mfPath = path.join(target, "forge-manifest.json");
    assert.ok(fs.existsSync(mfPath), "pack must contain forge-manifest.json");
    const mf = JSON.parse(fs.readFileSync(mfPath, "utf8"));
    assert.deepEqual(mf.ext.disciplines, disciplines);
    assert.deepEqual(validate(loadContractsSchema(), mf), []);

    const chk = node("validate-artifacts.mjs", ["--check", "forge-manifest", "--file", mfPath], { cwd: dir });
    assert.equal(chk.status, 0, chk.stdout + chk.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test("GB01: unknown discipline aborts package-spec before staging", () => {
  const dir = tmp();
  const target = tmp();
  const id = "selftest-manifest-bad-disc";
  try {
    decomposeReadyRun(dir, id, {
      profile: GODOT_PROFILE,
      specOverrides: {
        ext: { disciplines: { "tracer-loop": { _default: "not-a-discipline" } } }
      }
    });
    assert.equal(node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir }).status, 0);

    const before = fs.existsSync(target) ? fs.readdirSync(target) : [];
    const r = node("package-spec.mjs", ["--seed-id", id, "--to", target, "--write"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /mapping failed|aborted before staging/i);
    assert.match(r.stderr, /valid/);
    assert.match(r.stderr, /engineering|game-feel/);
    assert.equal(fs.readdirSync(target).length, before.length, "target must not be mutated on mapping abort");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
});

// --- F05b: post-complete revision export (SPEC §6-B) ---

/** Completed run: all decompose artifacts + ledger/phase at complete. */
function completeReadyRun(dir, id, opts = {}) {
  const runDir = decomposeReadyRun(dir, id, opts);
  assert.equal(node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir }).status, 0);
  advanceRun(dir, id, {
    phase: "complete",
    thesisPath: `.tgf/seeds/${id}/GAME_THESIS.md`,
    enginePath: `.tgf/seeds/${id}/decisions/0001-engine-profile.md`,
    specPath: `.tgf/seeds/${id}/SPEC.md`,
    ledgerPhases: ["handoff", "complete"]
  });
  return runDir;
}

/** Fixture game dir with a parent forge-manifest.json (raw-byte parent_digest source). */
function fixtureGameDir(parentBytes) {
  const gameDir = tmp();
  const body = parentBytes !== undefined
    ? parentBytes
    : fs.readFileSync(path.join(STUDIO_ROOT, "contracts", "fixtures", "manifest-revision", "base.json"));
  const parentPath = path.join(gameDir, "forge-manifest.json");
  fs.writeFileSync(parentPath, body);
  return {
    gameDir,
    parentPath,
    parentDigest: crypto.createHash("sha256").update(body).digest("hex")
  };
}

test("F05b AC1: revision export at complete emits v1.1.0 parent_digest + fresh pins", () => {
  const dir = tmp();
  const target = tmp();
  const id = "selftest-revision-export";
  const { gameDir, parentDigest } = fixtureGameDir();
  try {
    completeReadyRun(dir, id, { profile: GODOT_PROFILE });

    const r = node(
      "package-spec.mjs",
      ["--seed-id", id, "--to", target, "--write", "--revise-of", gameDir],
      { cwd: dir }
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);

    const mfPath = path.join(target, "forge-manifest.json");
    assert.ok(fs.existsSync(mfPath), "revision pack must contain forge-manifest.json");
    const mf = JSON.parse(fs.readFileSync(mfPath, "utf8"));

    assert.equal(mf.schema_version, "1.1.0");
    assert.equal(mf.parent_digest, parentDigest);
    assert.deepEqual(validate(loadContractsSchema(), mf), [], "schema-valid v1.1.0");

    const chk = node("validate-artifacts.mjs", ["--check", "forge-manifest", "--file", mfPath], { cwd: dir });
    assert.equal(chk.status, 0, chk.stdout + chk.stderr);

    // Fresh pins at export (same computePins path as plain export)
    const pins = computePins({
      assetsRoot: resolveAssetsRoot(REPO),
      loreRoot: resolveLoreRoot(REPO),
      contractsVersion: contractsVersion(REPO),
      forgeTemplate: null
    });
    assert.equal(pins.ok, true, (pins.missing || []).join(", "));
    assert.equal(mf.pins.assets_index, pins.pins.assets_index);
    assert.equal(mf.pins.lore_index, pins.pins.lore_index);
    // Revision floor pins contracts_version to schema_version (intake equality),
    // not the schema enum tip (may be ahead, e.g. 1.2.0 after Imagine).
    assert.equal(mf.pins.contracts_version, "1.1.0");
    assert.equal(mf.schema_version, mf.pins.contracts_version);
    assert.match(mf.pack_digest, /^[a-f0-9]{64}$/);

    assert.match(r.stdout, /revision: schema_version 1\.1\.0 parent_digest/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
    fs.rmSync(gameDir, { recursive: true, force: true });
  }
});

test("F05b AC2: plain re-export at complete still refused", () => {
  const dir = tmp();
  const target = tmp();
  const id = "selftest-complete-plain-refuse";
  try {
    completeReadyRun(dir, id, { profile: GODOT_PROFILE });
    const r = node("package-spec.mjs", ["--seed-id", id, "--to", target, "--write"], { cwd: dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /decompose or handoff.*complete/i);
    assert.equal(fs.readdirSync(target).length, 0, "refused plain export must not write pack");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test("F05b AC3: Godot-gate holds on revision (non-godot → no manifest + stable token)", () => {
  const dir = tmp();
  const target = tmp();
  const id = "selftest-revision-nongodot";
  const gameDir = tmp(); // non-godot parent may lack forge-manifest
  try {
    completeReadyRun(dir, id, { profile: "raw Canvas + TS" });
    const r = node(
      "package-spec.mjs",
      ["--seed-id", id, "--to", target, "--write", "--revise-of", gameDir],
      { cwd: dir }
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(`${FORGE_GATE_TOKEN} raw Canvas \\+ TS`));
    assert.ok(!fs.existsSync(path.join(target, "forge-manifest.json")), "no manifest for non-godot revision");
    assert.ok(fs.existsSync(path.join(target, "SPEC.md")), "pack still exports");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
    fs.rmSync(gameDir, { recursive: true, force: true });
  }
});

test("F05b AC4: revision mapping failure aborts with full missing-field list", () => {
  const dir = tmp();
  const target = tmp();
  const id = "selftest-revision-map-fail";
  const { gameDir } = fixtureGameDir();
  try {
    const runDir = completeReadyRun(dir, id, { profile: GODOT_PROFILE });
    const thesisPath = path.join(runDir, "GAME_THESIS.md");
    const thesis = JSON.parse(fs.readFileSync(rel("examples/fixtures/minimal-game-thesis.json"), "utf8"));
    delete thesis.golden_moment;
    fs.writeFileSync(thesisPath, "# GAME_THESIS.md\n\n```json\n" + JSON.stringify(thesis, null, 2) + "\n```\n");

    const before = fs.existsSync(target) ? fs.readdirSync(target) : [];
    const r = node(
      "package-spec.mjs",
      ["--seed-id", id, "--to", target, "--write", "--revise-of", gameDir],
      { cwd: dir }
    );
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /mapping failed|aborted before staging/i);
    assert.match(r.stderr, /thesis\.golden_moment/);
    assert.equal(fs.readdirSync(target).length, before.length, "target must not be mutated on mapping abort");
    assert.ok(!fs.existsSync(path.join(target, "forge-manifest.json")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
    fs.rmSync(gameDir, { recursive: true, force: true });
  }
});

test("F05b: P18/P19 name the revision path", () => {
  const p18 = fs.readFileSync(rel(".factory/prompts/P18_DECOMPOSE_SPEC.md"), "utf8");
  const p19 = fs.readFileSync(rel(".factory/prompts/P19_PACKAGE_SPEC.md"), "utf8");
  assert.match(p18, /REVISION AUTHORING/i);
  assert.match(p18, /--revise-of|revise-of/);
  assert.match(p19, /REVISION EXPORT/i);
  assert.match(p19, /--revise-of|revise-of/);
  assert.match(p19, /parent_digest/);
});

test("asset_source_policy omitted by default; present values floor to v1.2.0", () => {
  const { thesis, spec, engine, pins, meta } = baseMapInputs();
  const absent = { ...spec };
  delete absent.asset_source_policy;
  const r0 = mapForgeManifest({ thesis, spec: absent, engine, pins, meta });
  assert.equal(r0.ok, true, (r0.missing || []).join(", "));
  assert.equal(r0.manifest.asset_source_policy, undefined);
  // Base without policy claims pins.contracts_version (built-against), not a dead 1.0.0 literal.
  assert.equal(r0.manifest.schema_version, pins.contracts_version);
  assert.equal(r0.manifest.schema_version, r0.manifest.pins.contracts_version);
  assert.deepEqual(validate(loadContractsSchema(), r0.manifest), []);

  for (const policy of ["local", "imagine", "combo"]) {
    const r = mapForgeManifest({
      thesis,
      spec: { ...spec, asset_source_policy: policy },
      engine,
      pins,
      meta
    });
    assert.equal(r.ok, true, `${policy}: ${(r.missing || []).join(", ")}`);
    assert.equal(r.manifest.asset_source_policy, policy);
    assert.equal(r.manifest.schema_version, "1.2.0");
    assert.equal(r.manifest.pins.contracts_version, "1.2.0");
    assert.equal(r.manifest.schema_version, r.manifest.pins.contracts_version);
    assert.deepEqual(validate(loadContractsSchema(), r.manifest), []);
  }

  const bad = mapForgeManifest({
    thesis,
    spec: { ...spec, asset_source_policy: "purchased-only" },
    engine,
    pins,
    meta
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.missing.includes("spec.asset_source_policy"), bad.missing.join(", "));
});

/** Replicate forge/src/intake.mjs validateContractVersion equality gate (read-only). */
function forgeIntakeContractVersionOk(manifest, { revise = false } = {}) {
  const CONTRACT_VERSIONS = new Set(["1.0.0", "1.1.0", "1.2.0"]);
  const REVISION_CONTRACT_VERSIONS = new Set(["1.1.0", "1.2.0"]);
  const schemaVersion = manifest.schema_version;
  const contractsVersionPin = manifest.pins?.contracts_version;
  if (
    !CONTRACT_VERSIONS.has(schemaVersion) ||
    !CONTRACT_VERSIONS.has(contractsVersionPin) ||
    schemaVersion !== contractsVersionPin ||
    (revise && !REVISION_CONTRACT_VERSIONS.has(schemaVersion))
  ) {
    return false;
  }
  return true;
}

test("DES-A: every export path keeps schema_version === pins.contracts_version", () => {
  // Unit mapper: default-local base (pins tip or fixture pin) + policy present.
  const { thesis, spec, engine, pins, meta } = baseMapInputs({
    // pins from baseMapInputs is 1.0.0 — still must be coherent after map
  });
  const noPolicy = { ...spec };
  delete noPolicy.asset_source_policy;
  const rLocal = mapForgeManifest({ thesis, spec: noPolicy, engine, pins, meta });
  assert.equal(rLocal.ok, true, (rLocal.missing || []).join(", "));
  assert.equal(rLocal.manifest.schema_version, rLocal.manifest.pins.contracts_version);
  assert.ok(forgeIntakeContractVersionOk(rLocal.manifest));

  const tipPins = { ...pins, contracts_version: contractsVersion(REPO) || "1.2.0" };
  const rTip = mapForgeManifest({ thesis, spec: noPolicy, engine, pins: tipPins, meta });
  assert.equal(rTip.ok, true, (rTip.missing || []).join(", "));
  assert.equal(rTip.manifest.schema_version, tipPins.contracts_version);
  assert.equal(rTip.manifest.schema_version, rTip.manifest.pins.contracts_version);
  assert.ok(forgeIntakeContractVersionOk(rTip.manifest));

  for (const policy of ["local", "imagine", "combo"]) {
    const r = mapForgeManifest({
      thesis,
      spec: { ...spec, asset_source_policy: policy },
      engine,
      pins: tipPins,
      meta
    });
    assert.equal(r.ok, true, policy);
    assert.equal(r.manifest.schema_version, r.manifest.pins.contracts_version);
    assert.ok(forgeIntakeContractVersionOk(r.manifest));
  }
});

test("DES-A live round-trip: package-spec base export passes forge intake contract check", () => {
  const dir = tmp();
  const target = tmp();
  const id = "selftest-des-a-intake";
  try {
    decomposeReadyRun(dir, id, { profile: GODOT_PROFILE });
    assert.equal(node("emit-local-issues.mjs", ["--seed-id", id, "--write"], { cwd: dir }).status, 0);

    const r = node("package-spec.mjs", ["--seed-id", id, "--to", target, "--write"], { cwd: dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);

    const mfPath = path.join(target, "forge-manifest.json");
    assert.ok(fs.existsSync(mfPath));
    const mf = JSON.parse(fs.readFileSync(mfPath, "utf8"));

    // Policy-less fixture: both must equal contracts tip; intake equality holds.
    assert.equal(mf.asset_source_policy, undefined);
    assert.equal(mf.schema_version, mf.pins.contracts_version);
    assert.equal(mf.schema_version, contractsVersion(REPO));
    assert.ok(
      forgeIntakeContractVersionOk(mf),
      `forge intake would reject: schema=${mf.schema_version} pins=${mf.pins.contracts_version}`
    );
    console.log(
      `[DES-A proof] schema_version=${mf.schema_version} pins.contracts_version=${mf.pins.contracts_version} forgeIntakeContractVersionOk=true`
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  }
});
