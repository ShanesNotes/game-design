#!/usr/bin/env node
// Advisory design-time probe for semantic asset requests and lore motif IDs.
// Missing external indexes skip that probe surface; nothing here gates packaging.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { arg } from "./lib/argv.mjs";
import {
  isValidSeedId, readEmbeddedArtifact, readManifest, resolveRunPath,
  runDirFor, runRelFor, writeRunFileSync
} from "./lib/run-state.mjs";
import { resolveAssetsRoot, resolveLoreRoot } from "./lib/studio-paths.mjs";
import {
  ASSET_INDEXES,
  createSubprocessAdapter,
  findForRequest
} from "./lib/asset-finder.mjs";

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MATCH_FIELD = {
  sprite: "sprite_matches",
  model: "model_matches",
  animation: "animation_matches",
  audio: "audio_matches"
};

function fail(message) {
  console.error(`[spec-probe] ERROR: ${message}`);
  process.exit(1);
}

function warnSkipped(file) {
  console.warn(`WARN probe skipped: ${file}`);
}

function readJsonLines(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/u)
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

function assetTop3(rows, request) {
  const field = MATCH_FIELD[request.kind];
  return rows.flatMap((row) => (row[field] || []).map((match) => ({
    pack_id: row.pack_id,
    name: request.kind === "animation" ? match.clip : match.name
  }))).slice(0, 3);
}

function probeAsset(adapter, request) {
  const result = findForRequest(adapter, request, { limit: 10, checkLocal: false });
  if (result.status === "error") {
    console.warn(
      `[spec-probe] WARN asset request ${request.request_id}: ${result.note || "finder error"}`
    );
    return null;
  }
  if (result.status === "empty") {
    console.warn(`[spec-probe] WARN asset request ${request.request_id}: empty request text`);
    return null;
  }
  if (result.status === "no_match") {
    return { hits: 0, top3: [] };
  }
  // status === 'matches' — may be zero specialized hits for this kind
  const field = MATCH_FIELD[request.kind];
  const hits = result.rows.reduce(
    (total, row) => total + (Array.isArray(row[field]) ? row[field].length : 0),
    0
  );
  const top3 = assetTop3(result.rows, request);
  return { hits, top3 };
}

const seedId = arg("seed-id");
if (!seedId) fail("usage: --seed-id <id>");
if (!isValidSeedId(seedId)) fail(`invalid --seed-id: ${seedId}`);

const runDir = runDirFor(process.cwd(), seedId);
const runRel = runRelFor(seedId);
let manifest;
try { manifest = readManifest(runDir, seedId, process.cwd()); }
catch (error) { fail(`manifest rejected: ${error.message}`); }
if (!manifest) fail(`no run at ${runRel}`);
if (!manifest.spec_path) fail("manifest has no spec_path");

let specPath;
try { specPath = resolveRunPath(process.cwd(), seedId, manifest.spec_path, "spec_path"); }
catch (error) { fail(error.message); }
const { obj: spec, errors } = readEmbeddedArtifact(specPath, "spec-decomposition");
if (!spec) fail(`spec invalid:\n  ${errors.join("\n  ")}`);

// Schema treats asset_requests / lore_refs as optional; absence means an
// empty advisory report, never a crash.
const specAssetRequests = spec.asset_requests || [];
const specLoreRefs = spec.lore_refs || [];
const report = { asset_requests: {}, lore_refs: {} };
const assetsRoot = resolveAssetsRoot(FACTORY_ROOT);
if (specAssetRequests.length) {
  const assetPaths = [
    assetsRoot && path.join(assetsRoot, "_tools", "find_assets.py"),
    ...ASSET_INDEXES.map((name) => assetsRoot && path.join(assetsRoot, "_indexes", `${name}.jsonl`))
  ];
  const missing = assetPaths.filter((file) => !file || !fs.existsSync(file));
  if (missing.length) missing.forEach((file) => warnSkipped(file || "GAME_ASSETS_ROOT"));
  else {
    const adapter = createSubprocessAdapter({
      assetsRoot,
      startDir: FACTORY_ROOT
    });
    for (const request of specAssetRequests) {
      const result = probeAsset(adapter, request);
      if (result) report.asset_requests[request.request_id] = result;
    }
  }
}

const loreRoot = resolveLoreRoot(FACTORY_ROOT);
if (specLoreRefs.length) {
  const motifsPath = loreRoot && path.join(loreRoot, "_indexes", "motifs.jsonl");
  if (!motifsPath || !fs.existsSync(motifsPath)) warnSkipped(motifsPath || "GAME_LORE_ROOT");
  else {
    const motifs = new Map(readJsonLines(motifsPath).map((row) => [row.motif_id, row]));
    for (const ref of specLoreRefs) {
      const motif = motifs.get(ref.motif_id);
      report.lore_refs[ref.motif_id] = motif
        ? { hits: 1, top3: [{ motif_id: motif.motif_id, names: motif.names, page: motif.page }] }
        : { hits: 0, top3: [] };
    }
  }
}

const reportRel = `${runRel}/reviews/availability-report.json`;
writeRunFileSync(process.cwd(), seedId, reportRel, JSON.stringify(report, null, 2) + "\n");
console.log(`[spec-probe] wrote ${reportRel}`);
