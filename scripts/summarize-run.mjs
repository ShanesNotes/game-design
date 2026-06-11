#!/usr/bin/env node
// Print a short, evidence-first summary of a seed run from its manifest + ledger.
// Reads run state through scripts/lib/run-state.mjs so path math and crash-safe
// parsing live in one place; a single malformed ledger row no longer aborts the
// summary. Usage: node scripts/summarize-run.mjs --seed-id <seed-id>
import { runDirFor, readManifest, readLedger, isValidSeedId, validateLedgerRow } from "./lib/run-state.mjs";

const args = process.argv.slice(2);
const i = args.indexOf("--seed-id");
const seedId = i >= 0 ? args[i + 1] : null;
if (!seedId) {
  console.error("Usage: node scripts/summarize-run.mjs --seed-id <seed-id>");
  process.exit(1);
}
if (!isValidSeedId(seedId)) {
  console.error(`invalid --seed-id: ${seedId}`);
  process.exit(1);
}

const runDir = runDirFor(process.cwd(), seedId);
let manifest;
try {
  manifest = readManifest(runDir, seedId, process.cwd());
} catch (e) {
  console.error(`manifest.json for ${seedId} rejected: ${e.message}`);
  process.exit(1);
}
if (!manifest) {
  console.error(`No run found at .tgf/seeds/${seedId}`);
  process.exit(1);
}

let ledger;
try {
  ledger = readLedger(runDir, seedId, process.cwd());
} catch (e) {
  console.error(`execution-ledger.jsonl for ${seedId} rejected: ${e.message}`);
  process.exit(1);
}
const { rows, parseErrors } = ledger;
if (parseErrors.length) {
  console.error(`execution-ledger.jsonl for ${seedId} invalid:\n  ${parseErrors.join("\n  ")}`);
  process.exit(1);
}
for (const [i, row] of rows.entries()) {
  const errors = validateLedgerRow(row);
  if (errors.length) {
    console.error(`execution-ledger.jsonl row ${i + 1} invalid:\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
}
const last = rows[rows.length - 1];

console.log(`# Seed run: ${manifest.seed_id}`);
console.log(`- phase:        ${manifest.current_phase}`);
console.log(`- thesis:       ${manifest.game_thesis_path || "(not compiled)"}`);
console.log(`- engine ADR:   ${manifest.engine_decision_path || "(not decided)"}`);
console.log(`- spec:         ${manifest.spec_path || "(not decomposed)"}`);
console.log(`- spec pack:    ${manifest.spec_pack_path || "(none — not exported)"}`);
console.log(`- ledger rows:  ${rows.length}`);
if (last) console.log(`- last event:   ${last.phase}/${last.event} (${last.status})`);
if (parseErrors.length) console.log(`- ledger warns: ${parseErrors.length} unparseable row(s) skipped`);
if (manifest.resume_point) {
  console.log(`- next action:  ${manifest.resume_point.reason}`);
  console.log(`                -> ${manifest.resume_point.artifact_path}`);
}
