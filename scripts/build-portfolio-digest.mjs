#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { arg } from "./lib/argv.mjs";
import { openPortfolio } from "./lib/portfolio-memory.mjs";
import { isValidSeedId } from "./lib/run-state.mjs";
import { validate } from "./lib/validate-json-schema.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedId = arg("seed-id");

function fail(message) {
  console.error(`[portfolio-digest] ERROR: ${message}`);
  process.exit(1);
}

if (!seedId || !isValidSeedId(seedId)) {
  fail("usage: node scripts/build-portfolio-digest.mjs --seed-id <kebab-id>");
}

const content = openPortfolio(process.cwd()).buildDigestContent(seedId);
const digest = {
  schema_version: content.schema_version,
  seed_id: seedId,
  generated_at: new Date().toISOString(),
  sources: content.sources,
  prior_theses: content.prior_theses,
  games: content.games,
  skipped: content.skipped
};
const schema = JSON.parse(fs.readFileSync(path.join(REPO, "schemas", "portfolio-digest.schema.json"), "utf8"));
const errors = validate(schema, digest);
if (errors.length) fail(`generated digest is invalid:\n  ${errors.join("\n  ")}`);

const output = path.join(process.cwd(), ".tgf", "seeds", seedId, "intake", "portfolio-digest.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(digest, null, 2) + "\n");
console.log(`[portfolio-digest] wrote ${path.relative(process.cwd(), output)} (${digest.prior_theses.length} prior theses, ${digest.games.length} games)`);
