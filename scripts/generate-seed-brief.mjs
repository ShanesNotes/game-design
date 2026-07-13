#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { arg, hasFlag } from "./lib/argv.mjs";
import { DESIGN_REGISTERS } from "./lib/factory-contract.mjs";
import { buildPortfolioDigestContent } from "./lib/portfolio-memory.mjs";
import { isValidSeedId } from "./lib/run-state.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requestedSeedId = arg("seed-id");
const init = hasFlag("init");

function fail(message) {
  console.error(`[seed-auto] ERROR: ${message}`);
  process.exit(1);
}

if (requestedSeedId && !isValidSeedId(requestedSeedId)) {
  fail(`--seed-id must be a kebab id (got "${requestedSeedId}")`);
}

const digest = buildPortfolioDigestContent(requestedSeedId || "auto-seed", process.cwd());
const registerCounts = new Map(DESIGN_REGISTERS.map((register) => [register, 0]));
const verbCounts = new Map();

for (const row of digest.prior_theses) {
  if (registerCounts.has(row.design_register)) {
    registerCounts.set(row.design_register, registerCounts.get(row.design_register) + 1);
  }
  const rawVerbs = row.parked ? row.candidate_loop_verbs : row.chosen_loop?.verbs;
  const verbs = Array.isArray(rawVerbs) ? rawVerbs : (typeof rawVerbs === "string" ? rawVerbs.split(",") : []);
  for (const verb of new Set(verbs.map((value) => String(value).trim().toLowerCase()).filter(Boolean))) {
    verbCounts.set(verb, (verbCounts.get(verb) || 0) + 1);
  }
}

const [register, registerCount] = [...registerCounts.entries()]
  .sort((a, b) => a[1] - b[1] || DESIGN_REGISTERS.indexOf(a[0]) - DESIGN_REGISTERS.indexOf(b[0]))[0];
const [verb, verbCount] = verbCounts.size
  ? [...verbCounts.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]
  : ["transform", 0];
const seed = `A ${register} game centered on ${verb}, where each use closes one route and opens another.`;
const slug = `${register}-${verb}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const seedId = requestedSeedId || `auto-${slug}`;

console.log(`SEED: ${seed}`);
console.log("WHY:");
console.log(`Gap: ${register} appears ${registerCount} time(s), and chosen-loop verb '${verb}' appears ${verbCount} time(s) across recorded portfolio evidence.`);

if (init) {
  const result = spawnSync(process.execPath, [
    path.join(REPO, "scripts", "init-game-run.mjs"),
    "--seed-id", seedId,
    "--seed", seed,
    "--mode", "yolo",
    "--origination", "auto"
  ], { cwd: process.cwd(), encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status || 1);
}
