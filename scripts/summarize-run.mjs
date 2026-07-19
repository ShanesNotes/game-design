#!/usr/bin/env node
// Print a short, evidence-first summary of a seed run from its manifest + ledger.
// Reads run state through scripts/lib/run-state.mjs so path math, validation, and
// reconciliation live in one place; malformed truth is rejected before output.
// Usage: node scripts/summarize-run.mjs --seed-id <seed-id>
import { isValidSeedId, openRun } from "./lib/run-state.mjs";
import { arg } from "./lib/argv.mjs";

const seedId = arg("seed-id");
if (!seedId) {
  console.error("Usage: node scripts/summarize-run.mjs --seed-id <seed-id>");
  process.exit(1);
}
if (!isValidSeedId(seedId)) {
  console.error(`invalid --seed-id: ${seedId}`);
  process.exit(1);
}

let run;
try {
  run = openRun(process.cwd(), seedId);
} catch (e) {
  if (e.code === "RUN_NOT_FOUND") console.error(`No run found at .tgf/seeds/${seedId}`);
  else if (e.code === "MANIFEST_REJECTED") console.error(`manifest.json for ${seedId} rejected: ${e.message}`);
  else if (["LEDGER_REJECTED", "LEDGER_INVALID"].includes(e.code)) {
    console.error(`execution-ledger.jsonl for ${seedId} invalid:\n  ${(e.errors || [e.message]).join("\n  ")}`);
  } else console.error(`run ${seedId} invalid:\n  ${(e.errors || [e.message]).join("\n  ")}`);
  process.exit(1);
}
const { manifest, ledgerRows: rows, latestEvent: last } = run;

// spec_pack_path is only recorded for default-root exports (manifest path
// policy); revision exports (--revise-of) target an existing game dir, so
// their truth lives in the ledger. Derive that state instead of contradicting it.
const specPackLine = run.exportStatus.path
  || (run.exportStatus.kind === "revision"
    ? `(revision-exported to existing game dir — ${run.exportStatus.revision_count} ledger row${run.exportStatus.revision_count === 1 ? "" : "s"})`
    : "(none — not exported)");

console.log(`# Seed run: ${manifest.seed_id}`);
console.log(`- phase:        ${manifest.current_phase}`);
console.log(`- thesis:       ${manifest.game_thesis_path || "(not compiled)"}`);
console.log(`- engine ADR:   ${manifest.engine_decision_path || "(not decided)"}`);
console.log(`- spec:         ${manifest.spec_path || "(not decomposed)"}`);
console.log(`- spec pack:    ${specPackLine}`);
console.log(`- ledger rows:  ${rows.length}`);
if (last) console.log(`- last event:   ${last.phase}/${last.event} (${last.status})`);
if (manifest.resume_point) {
  console.log(`- next action:  ${manifest.resume_point.reason}`);
  console.log(`                -> ${manifest.resume_point.artifact_path}`);
}
