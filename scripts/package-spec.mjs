#!/usr/bin/env node
// Export a seed's finished spec as a clean, self-contained SPEC PACK — the
// factory's terminal artifact (ADR 0006). Assembles validated run artifacts
// (SPEC.md, thesis, engine decision, issues/) with the co-dev templates and the
// shipped guards into a staging dir, proves the result leaks no factory state,
// then writes it to the target folder. Dry-run by default; --write materializes.
//
// For godot-4 seeds, also emits a schema-valid forge-manifest.json (SPEC §3.4).
// Non-godot engines package successfully with no manifest and print
// `FORGE-GATE:ENGINE <profile>`; --require-manifest upgrades that to a hard fail.
// Mapping failure aborts BEFORE staging and lists every missing field.
//
// Handoff (staging → verify → dry-run | exact target materialize → cleanup →
// receipt) is owned by runSpecPackHandoff; CLI exits only after that returns.
// Run evidence is recorded only from a successful export receipt.
//
// Usage: node scripts/package-spec.mjs --seed-id <id> [--to <dir>] [--write]
//          [--force] [--require-manifest]
//          [--revise-of <game-dir>]   # post-complete revision (SPEC §6-B); parent_digest
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  runDirFor, runRelFor, readManifest, readEmbeddedArtifact, isValidSeedId, resolveRunPath,
  specPackRootFor, validateManifest, manifestPathPolicyErrors, pathIsInside,
  writeRunFileSync, appendRunFileSync, validateLedgerRow, firstSymlinkComponent
} from "./lib/run-state.mjs";
import { listFiles } from "./lib/leakage.mjs";
import { renderTemplate } from "./lib/template.mjs";
import { arg, hasFlag } from "./lib/argv.mjs";
import { validate } from "./lib/validate-json-schema.mjs";
import {
  GODOT_PROFILE,
  forgeGateLine,
  mapForgeManifest,
  computePins,
  computePackDigest,
  ASSET_SOURCE_POLICY_SCHEMA_VERSION,
  DERIVE_SCHEMA_VERSION
} from "./lib/manifest-mapper.mjs";
import {
  resolveAssetsRoot,
  resolveLoreRoot,
  contractsVersion,
  forgeManifestSchemaPath
} from "./lib/studio-paths.mjs";
import { runSpecPackHandoff } from "./lib/spec-pack-export.mjs";

/** forge-manifest schema_version for revision exports (parent_digest requires 1.1.0). */
const REVISION_SCHEMA_VERSION = "1.1.0";

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PKG = JSON.parse(fs.readFileSync(path.join(FACTORY_ROOT, "package.json"), "utf8"));

function fail(msg) { console.error(`[package-spec] ERROR: ${msg}`); process.exit(1); }

const seedId = arg("seed-id");
const write = hasFlag("write");
const force = hasFlag("force");
const requireManifest = hasFlag("require-manifest");
const reviseOf = arg("revise-of");
const isRevision = Boolean(reviseOf);

if (!seedId) {
  fail("usage: --seed-id <id> [--to <dir>] [--write] [--force] [--require-manifest] [--revise-of <game-dir>]");
}
if (!isValidSeedId(seedId)) fail(`invalid --seed-id: ${seedId}`);
const target = path.resolve(arg("to", specPackRootFor(seedId)));

const runDir = runDirFor(process.cwd(), seedId);
const runRel = runRelFor(seedId);
let manifest;
try { manifest = readManifest(runDir, seedId, process.cwd()); }
catch (e) { fail(`manifest rejected: ${e.message}`); }
if (!manifest) fail(`no run at ${runRel}`);

// The whole run must be valid (phase legality, design-lock evidence, embedded
// artifact schemas, spec consistency) before anything is exported. Completion is
// verifier evidence, not prose — reuse the run check rather than re-deriving it.
const runCheck = spawnSync(process.execPath,
  [path.join(FACTORY_ROOT, "scripts", "validate-artifacts.mjs"), "--check", "run", "--seed-id", seedId],
  { cwd: process.cwd(), encoding: "utf8" });
if (runCheck.status !== 0) fail(`run validation failed:\n${runCheck.stdout || runCheck.stderr}`);

// Plain export: decompose|handoff only. Revision export (--revise-of): complete only.
// complete stays absorbing for plain packs (SPEC §6-B / F05b).
if (isRevision) {
  if (manifest.current_phase !== "complete") {
    fail(`revision export (--revise-of) requires current_phase complete, got '${manifest.current_phase}'`);
  }
} else if (!["decompose", "handoff"].includes(manifest.current_phase)) {
  fail(`spec pack export requires current_phase decompose or handoff, got '${manifest.current_phase}'`);
}
if (!manifest.spec_path) fail("refusing to package before SPEC.md exists (decompose phase)");

let gameDir = null;
if (isRevision) {
  gameDir = path.resolve(reviseOf);
  if (!fs.existsSync(gameDir) || !fs.statSync(gameDir).isDirectory()) {
    fail(`--revise-of must be an existing game directory: ${gameDir}`);
  }
}

const issuesDir = path.join(runDir, "issues");
const issueFiles = fs.existsSync(issuesDir)
  ? fs.readdirSync(issuesDir).filter((f) => f.endsWith(".md")).sort()
  : [];
if (!issueFiles.length) fail(`no issues rendered under ${runRel}/issues — run emit-local-issues.mjs --write first`);

const seedText = fs.existsSync(path.join(runDir, "GAME_SEED.md"))
  ? fs.readFileSync(path.join(runDir, "GAME_SEED.md"), "utf8")
      .split("\n").map((l) => l.trim()).filter((l) => l && l !== "# GAME_SEED.md").join(" / ")
  : seedId;

let thesisPath; let enginePath; let specPath;
try {
  thesisPath = resolveRunPath(process.cwd(), seedId, manifest.game_thesis_path, "game_thesis_path");
  enginePath = resolveRunPath(process.cwd(), seedId, manifest.engine_decision_path, "engine_decision_path");
  specPath = resolveRunPath(process.cwd(), seedId, manifest.spec_path, "spec_path");
} catch (e) {
  fail(e.message);
}

const { obj: thesis, errors: thesisErrors } = readEmbeddedArtifact(thesisPath, "game-thesis");
if (!thesis) fail(`thesis invalid:\n  ${thesisErrors.join("\n  ")}`);

const { obj: engine, errors: engineErrors } = readEmbeddedArtifact(enginePath, "engine-profile-decision");
if (!engine) fail(`engine decision invalid:\n  ${engineErrors.join("\n  ")}`);

const { obj: spec, errors: specErrors } = readEmbeddedArtifact(specPath, "spec-decomposition");
if (!spec) fail(`spec invalid:\n  ${specErrors.join("\n  ")}`);

// Availability is design advice, never an export gate. If P18 authored a report,
// surface each zero-hit row with a stable token; missing/malformed reports are ignored.
const availabilityPath = path.join(runDir, "reviews", "availability-report.json");
try {
  const availability = JSON.parse(fs.readFileSync(availabilityPath, "utf8"));
  for (const [requestId, row] of Object.entries(availability.asset_requests || {})) {
    if (row?.hits === 0) console.warn(`[package-spec] WARN AVAILABILITY-ZERO:asset:${requestId}`);
  }
  for (const [motifId, row] of Object.entries(availability.lore_refs || {})) {
    if (row?.hits === 0) console.warn(`[package-spec] WARN AVAILABILITY-ZERO:lore:${motifId}`);
  }
} catch {
  // Advisory report absent or unreadable: packaging behavior and exit code stay unchanged.
}

// --- Godot-gate + forge-manifest mapping (BEFORE staging) ---
const engineProfile = String(engine.profile || "");
const isGodot = engineProfile === GODOT_PROFILE;
let pendingManifest = null; // filled for godot-4 after mapping; digest set after content stage
let parentDigest = null; // revision only: sha256 of game forge-manifest.json raw bytes

if (isRevision && isGodot) {
  const parentMfPath = path.join(gameDir, "forge-manifest.json");
  if (!fs.existsSync(parentMfPath) || !fs.statSync(parentMfPath).isFile()) {
    fail(`revision export requires ${parentMfPath} (parent_digest = sha256 of its raw bytes)`);
  }
  parentDigest = crypto.createHash("sha256").update(fs.readFileSync(parentMfPath)).digest("hex");
}

if (!isGodot) {
  const line = forgeGateLine(engineProfile || "(missing)");
  console.log(line);
  if (requireManifest) {
    fail(`--require-manifest set but engine profile is not ${GODOT_PROFILE} (${line})`);
  }
} else {
  // Pins recomputed at every export (plain + revision) — pin-refresh path (F05b).
  const pinsResult = computePins({
    assetsRoot: resolveAssetsRoot(FACTORY_ROOT),
    loreRoot: resolveLoreRoot(FACTORY_ROOT),
    contractsVersion: contractsVersion(FACTORY_ROOT),
    forgeTemplate: null
  });
  const preMissing = pinsResult.ok ? [] : pinsResult.missing;

  const mapResult = mapForgeManifest({
    thesis,
    spec,
    engine,
    pins: pinsResult.pins || {
      contracts_version: "",
      assets_index: "",
      lore_index: "",
      forge_template: null
    },
    meta: {
      game_id: seedId,
      seed_id: seedId,
      producer: { name: PKG.name || "game-design", version: PKG.version || "0.0.0" },
      created: new Date().toISOString(),
      // placeholder until pack content is staged
      pack_digest: "0".repeat(64)
    }
  });

  const allMissing = [...new Set([...preMissing, ...mapResult.missing])];
  if (allMissing.length) {
    fail(
      `forge-manifest mapping failed (export aborted before staging); missing fields:\n  - ${allMissing.join("\n  - ")}`
    );
  }
  pendingManifest = mapResult.manifest;
  // Full-manifest revision (SPEC §6-B): parent_digest; no delta language.
  // Version-floor ladder (same value on schema_version and pins.contracts_version):
  //   any request carries derive → 1.3.0
  //   else asset_source_policy present → 1.2.0
  //   else REVISION_SCHEMA_VERSION (1.1.0 parent_digest floor)
  if (isRevision) {
    const hasDerive =
      Array.isArray(pendingManifest.asset_requests) &&
      pendingManifest.asset_requests.some(
        (r) => r !== null && typeof r === "object" && !Array.isArray(r) && r.derive != null
      );
    const needsPolicyFloor = pendingManifest.asset_source_policy != null;
    const revVersion = hasDerive
      ? DERIVE_SCHEMA_VERSION
      : needsPolicyFloor
        ? ASSET_SOURCE_POLICY_SCHEMA_VERSION
        : REVISION_SCHEMA_VERSION;
    pendingManifest.schema_version = revVersion;
    pendingManifest.parent_digest = parentDigest;
    // Intake requires schema_version === pins.contracts_version.
    pendingManifest.pins.contracts_version = revVersion;
  }
}

// The pack doubles as a teaching workspace: MISSION.md and RESOURCES.md (the files
// a teaching skill boots from) are seeded from the validated thesis so the first
// co-dev session starts grounded in why this game, not with an empty mission.
const tplDir = path.join(FACTORY_ROOT, "templates", "spec-pack");
const sub = (s) => renderTemplate(s, {
  SEED_ID: seedId, SEED: seedText, PITCH: thesis.pitch, PLAYER_FANTASY: thesis.player_fantasy
});

function fillStaging(staging) {
  function put(relPath, contents) {
    const p = path.join(staging, relPath);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, contents);
  }
  function copyTree(fromDir, toRel) {
    for (const e of fs.readdirSync(fromDir, { withFileTypes: true })) {
      const from = path.join(fromDir, e.name);
      if (e.isDirectory()) copyTree(from, path.join(toRel, e.name));
      else put(path.join(toRel, e.name), fs.readFileSync(from, "utf8"));
    }
  }

  for (const f of ["README.md", "AGENTS.md", "PLAYTEST_PLAN.md", "MISSION.md", "RESOURCES.md", "NOTES.md"]) {
    put(f, sub(fs.readFileSync(path.join(tplDir, f), "utf8")));
  }
  copyTree(path.join(tplDir, "guards"), "guards");
  // Guards read the pack's declared design register (ADR 0007) so register-aware
  // doctrine (the narrative-first content allowance) travels with the pack. The
  // design canon (ADR 0009) rides along when the thesis names one, so the co-dev
  // repo inherits its design system instead of inventing a look.
  put(path.join("guards", "guard-config.json"),
    JSON.stringify({
      design_register: thesis.design_register ?? "mechanics-first",
      ...(thesis.design_canon ? { design_canon: thesis.design_canon } : {})
    }, null, 2) + "\n");
  put("GAME_SEED.md", fs.readFileSync(path.join(runDir, "GAME_SEED.md"), "utf8"));
  put("GAME_THESIS.md", fs.readFileSync(thesisPath, "utf8"));
  if (manifest.design_lane?.mode === "yolo") {
    const g1Path = path.join(runDir, "reviews", "G1_BRIEF.md");
    if (!fs.existsSync(g1Path)) {
      throw new Error("yolo pack requires reviews/G1_BRIEF.md; run npm run g1:brief first");
    }
    put("G1_BRIEF.md", fs.readFileSync(g1Path, "utf8"));
  }
  put("SPEC.md", fs.readFileSync(specPath, "utf8"));
  put(path.join("decisions", path.basename(enginePath)), fs.readFileSync(enginePath, "utf8"));
  for (const f of issueFiles) {
    if (firstSymlinkComponent(path.join(issuesDir, f))) {
      throw new Error(`issue file must not be a symlink: ${f}`);
    }
    put(path.join("issues", f), fs.readFileSync(path.join(issuesDir, f), "utf8"));
  }
  for (const s of ["playtest-report", "depth-vector", "asset-provenance"]) {
    // Shipped schemas drop the orchestrator name from their title — the pack must
    // not reference the factory (the leakage gate below enforces this).
    const schema = JSON.parse(fs.readFileSync(path.join(FACTORY_ROOT, "schemas", `${s}.schema.json`), "utf8"));
    schema.title = String(schema.title || "").replace(/^Tiny Game Factory\s*/, "Game ");
    put(path.join("schemas", `${s}.schema.json`), JSON.stringify(schema, null, 2) + "\n");
  }
  for (const d of ["playtests", "reviews"]) put(path.join(d, ".gitkeep"), "");

  // Forge-manifest: digest over staged content (excluding the manifest itself),
  // then validate against contracts schema and write.
  if (pendingManifest) {
    const entries = listFiles(staging).map((abs) => ({
      rel: path.relative(staging, abs).split(path.sep).join("/"),
      contents: fs.readFileSync(abs)
    }));
    pendingManifest.pack_digest = computePackDigest(entries);

    const schemaPath = forgeManifestSchemaPath(FACTORY_ROOT);
    if (!schemaPath) {
      throw new Error(
        "forge-manifest.schema.json not found via STUDIO_ROOT/contracts (set STUDIO_ROOT or GAME_CONTRACTS_ROOT)"
      );
    }
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const schemaErrors = validate(schema, pendingManifest);
    if (schemaErrors.length) {
      throw new Error(`forge-manifest failed contracts schema validation:\n  ${schemaErrors.join("\n  ")}`);
    }
    put("forge-manifest.json", JSON.stringify(pendingManifest, null, 2) + "\n");
  }
}

// Handoff owns staging, verification, dry-run / exact materialize, and cleanup.
// process.exit is only after this returns so staging always removes.
let handoff;
try {
  handoff = runSpecPackHandoff({
    fillStaging,
    target,
    write,
    force,
    seedId,
    log: console.log
  });
} catch (err) {
  fail(err && err.message ? err.message : String(err));
}

if (!handoff.ok) {
  fail(handoff.error || "spec pack handoff failed");
}

if (handoff.mode === "dry-run") {
  process.exit(0);
}

// Record export evidence only from a successful receipt (final tree verified).
const receipt = handoff.receipt;
if (!receipt) fail("internal error: export succeeded without receipt");

const packFiles = receipt.packFiles;
const iso = new Date().toISOString();
const insideDefaultRoot = pathIsInside(specPackRootFor(seedId), target);
const exportCmd = isRevision
  ? `node scripts/package-spec.mjs --seed-id ${seedId} --revise-of ${gameDir} --write`
  : `node scripts/package-spec.mjs --seed-id ${seedId} --write`;
const row = {
  ts: iso, seed_id: seedId, phase: manifest.current_phase,
  event: isRevision ? "spec-pack-revision-exported" : "spec-pack-exported",
  status: "passed", actor: "package-spec.mjs",
  changed_paths: [`${runRel}/manifest.json`, `${runRel}/execution-ledger.jsonl`],
  verification: {
    commands: [exportCmd],
    status: "passed",
    evidence: isRevision
      ? `revision pack exported (${packFiles.length} files); parent_digest set; pins recomputed; target recorded in this row's notes`
      : `spec pack exported (${packFiles.length} files) after run validation and leakage gate; target recorded in this row's notes`
  },
  blockers: []
};
const rowErrors = validateLedgerRow(row);
if (rowErrors.length) fail(`ledger row invalid:\n  ${rowErrors.join("\n  ")}`);
const next = JSON.parse(JSON.stringify(manifest));
if (insideDefaultRoot) next.spec_pack_path = target;
next.last_verified_at = iso;
const manErrors = [
  ...validateManifest(next).map((e) => `manifest ${e}`),
  ...manifestPathPolicyErrors(next, seedId)
];
if (manErrors.length) fail(`resulting manifest invalid:\n  ${manErrors.join("\n  ")}`);
writeRunFileSync(process.cwd(), seedId, `${runRel}/manifest.json`, JSON.stringify(next, null, 2) + "\n");
appendRunFileSync(process.cwd(), seedId, `${runRel}/execution-ledger.jsonl`, JSON.stringify(row) + "\n");

console.log(`[package-spec] exported ${packFiles.length} files to ${target}`);
if (pendingManifest) {
  console.log(`[package-spec] forge-manifest.json emitted (engine ${GODOT_PROFILE})`);
  if (isRevision) {
    console.log(
      `[package-spec] revision: schema_version ${pendingManifest.schema_version} parent_digest ${parentDigest}`
    );
  }
}
console.log(`[package-spec] next: open ${target} in a fresh session and follow its AGENTS.md`);
