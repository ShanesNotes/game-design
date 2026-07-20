#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { arg } from "./lib/argv.mjs";
import { depthVectorConsistencyErrors, feelTargetRequiredForAdvanceErrors } from "./lib/anti-boring-gate.mjs";
import { DEPTH_AXES } from "./lib/portfolio-memory.mjs";
import { leakageErrors } from "./lib/leakage.mjs";
import {
  isValidSeedId, readEmbeddedArtifact, readManifest, resolveRunPath,
  runDirFor, runRelFor, writeRunFileSync
} from "./lib/run-state.mjs";
import { validate } from "./lib/validate-json-schema.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedId = arg("seed-id");

function fail(message) {
  console.error(`[g1-brief] ERROR: ${message}`);
  process.exit(1);
}

if (!seedId || !isValidSeedId(seedId)) {
  fail("usage: node scripts/generate-g1-brief.mjs --seed-id <kebab-id>");
}

const runDir = runDirFor(process.cwd(), seedId);
const runRel = runRelFor(seedId);
let manifest;
try { manifest = readManifest(runDir, seedId, process.cwd()); }
catch (error) { fail(`manifest rejected: ${error.message}`); }
if (!manifest?.game_thesis_path) fail("manifest has no game_thesis_path");

const runCheck = spawnSync(process.execPath, [
  path.join(REPO, "scripts", "validate-artifacts.mjs"),
  "--check", "run", "--seed-id", seedId
], { cwd: process.cwd(), encoding: "utf8" });
if (runCheck.status !== 0) {
  fail(`run has not reached validated design-lock:\n${runCheck.stdout || runCheck.stderr}`);
}

let thesisPath;
try { thesisPath = resolveRunPath(process.cwd(), seedId, manifest.game_thesis_path, "game_thesis_path"); }
catch (error) { fail(error.message); }
const { obj: thesis, errors: thesisErrors } = readEmbeddedArtifact(thesisPath, "game-thesis");
if (!thesis) fail(`thesis invalid:\n  ${thesisErrors.join("\n  ")}`);

const reviewsDir = path.join(runDir, "reviews");
const vectors = [];
function collectVectors(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collectVectors(file);
    else if (entry.name === "depth-vector.json") vectors.push(file);
  }
}
collectVectors(reviewsDir);
vectors.sort((a, b) => {
  const canonical = path.join(reviewsDir, "depth-vector.json");
  if (a === canonical) return -1;
  if (b === canonical) return 1;
  return a.localeCompare(b);
});

const vectorSchema = JSON.parse(fs.readFileSync(path.join(REPO, "schemas", "depth-vector.schema.json"), "utf8"));
let depthVector = null;
for (const file of vectors) {
  let candidate;
  try { candidate = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { continue; }
  const register = candidate.register ?? "mechanics-first";
  const thesisRegister = thesis.design_register ?? "mechanics-first";
  const errors = [
    ...validate(vectorSchema, candidate),
    ...depthVectorConsistencyErrors(candidate),
    ...feelTargetRequiredForAdvanceErrors(thesis, candidate.verdict)
  ];
  if (candidate.verdict === "ADVANCE" && register === thesisRegister && errors.length === 0) {
    depthVector = candidate;
    break;
  }
}
if (!depthVector) fail("no gate-passing ADVANCE depth vector exists under reviews/");

const verdictPath = path.join(reviewsDir, "ANTI_BORING_VERDICT.md");
const verdictText = fs.existsSync(verdictPath) ? fs.readFileSync(verdictPath, "utf8") : "";
// P07 verdict-line contract: `VERDICT: <RULING>` on its own line, or a
// `## Verdict` heading followed by the bold ruling (e.g. `**ADVANCE**`).
const verdictMatch = verdictText.match(/(?:^|\n)[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?VERDICT[ \t]*:(?:\*\*)?[ \t]*(?:\r?\n[ \t]*)?(ADVANCE|DEEPEN|KILL)[ \t]*(?:\*\*)?[ \t]*(?=\r?\n|$)/i)
  ?? verdictText.match(/(?:^|\n)[ \t]*#{1,6}[ \t]*VERDICT[ \t]*\r?\n(?:[ \t]*\r?\n)*[ \t]*\*\*(ADVANCE|DEEPEN|KILL)\*\*[ \t]*(?=\r?\n|$)/i);
if (verdictMatch?.[1]?.toUpperCase() !== "ADVANCE") {
  fail("reviews/ANTI_BORING_VERDICT.md is missing an ADVANCE verdict");
}

const pitchSentences = String(thesis.pitch || "")
  .match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.slice(0, 3).map((sentence) => sentence.trim()) ?? [];
const weakest = DEPTH_AXES
  .map((axis, order) => ({ axis, order, score: depthVector.scores[axis], evidence: depthVector.evidence?.[axis] }))
  .sort((a, b) => a.score - b.score || a.order - b.order)
  .slice(0, 2);
const distinctness = thesis.portfolio_distinctness;
const cuts = Array.isArray(thesis.out_of_scope) && thesis.out_of_scope.length
  ? thesis.out_of_scope
  : (Array.isArray(thesis.first_playable_slice?.excluded) ? thesis.first_playable_slice.excluded : []);
const feelTargets = Array.isArray(thesis.feel_targets) ? thesis.feel_targets : [];
const nearest = distinctness?.nearest_prior_seed ?? "none";

const lines = [
  "# G1 Brief",
  "",
  "## Pitch",
  "",
  pitchSentences.join(" "),
  "",
  "## Register",
  "",
  thesis.design_register ?? "mechanics-first",
  "",
  "## Golden moment",
  "",
  thesis.golden_moment ?? "Not recorded.",
  "",
  "## Evidence",
  "",
  `Verdict: ${depthVector.verdict}. Total: ${depthVector.total}/24.`,
  "",
  ...weakest.map((row) => `- ${row.axis}: ${row.score}/2 — ${row.evidence ?? "not recorded"}`),
  "",
  "## Difference",
  "",
  distinctness
    ? `Nearest prior: ${nearest}. Disposition: ${distinctness.falsifying_difference}`
    : "Nearest prior: none. Disposition: no prior disposition was recorded.",
  "",
  "## Feel targets",
  "",
  ...(feelTargets.length
    ? feelTargets.map((target) => `- ${target.statement} (${target.metric}: ${target.budget} ${target.unit})`)
    : ["- No feel target was recorded."]),
  "",
  "## Cuts",
  "",
  ...(cuts.length ? cuts.map((cut) => `- ${cut}`) : ["- No cuts were recorded."]),
  "",
  "## What Shane is being asked to taste-judge",
  "",
  `Judge whether this moment warrants decomposition, whether the cuts protect it, and whether the difference from ${nearest} survives play.`,
  ""
];

const brief = lines.join("\n");
const scanDir = fs.mkdtempSync(path.join(os.tmpdir(), "g1-brief-scan-"));
let leaks;
try {
  fs.writeFileSync(path.join(scanDir, "G1_BRIEF.md"), brief);
  leaks = leakageErrors([scanDir], scanDir);
} finally {
  fs.rmSync(scanDir, { recursive: true, force: true });
}
if (leaks.length) fail(`rendered brief failed leakage gate:\n  ${leaks.join("\n  ")}`);

const outputRel = `${runRel}/reviews/G1_BRIEF.md`;
try { writeRunFileSync(process.cwd(), seedId, outputRel, brief); }
catch (error) { fail(error.message); }
console.log(`[g1-brief] wrote ${outputRel}`);
