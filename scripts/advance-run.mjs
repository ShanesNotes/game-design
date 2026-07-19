#!/usr/bin/env node
// Advance one seed run to its next phase, atomically and legally. This is the
// write-side counterpart to summarize-run.mjs (read-side): both go through
// scripts/lib/run-state.mjs so the phase machine, schema validation, and path
// policy have one home. It refuses an illegal phase transition, appends a
// schema-valid ledger row, updates the manifest's current_phase / resume_point /
// last_verified_at, applies field edits (--set, --append), and re-validates the
// whole run before replacing ledger then manifest. A failed manifest replacement
// rolls the ledger back to its exact prior bytes.
//
// Usage:
//   node scripts/advance-run.mjs --seed-id <id> --to <phase> --event <event>
//     [--status <ledger-status>] [--actor <name>] [--lane <lane>]
//     [--note <resume reason>] [--resume-artifact <path>]
//     [--set <key>=<jsonOrString> ...] [--append <key>=<value> ...] [--dry-run]
import {
  advanceRun, isValidSeedId, runRelFor
} from "./lib/run-state.mjs";
import { arg, multi, hasFlag } from "./lib/argv.mjs";

function fail(msg) { console.error(`[advance-run] ERROR: ${msg}`); process.exit(1); }

const seedId = arg("seed-id");
const to = arg("to");
const event = arg("event");
const status = arg("status", "checkpointed");
const actor = arg("actor", "agent");
const lane = arg("lane");
const note = arg("note");
const resumeArtifact = arg("resume-artifact");
const dryRun = hasFlag("dry-run");
const setPairs = multi("set");

if (!seedId || !to || !event) {
  fail('usage: --seed-id <id> --to <phase> --event <event> [--status] [--actor] [--lane] [--note] [--resume-artifact] [--set k=v] [--append k=v] [--dry-run]');
}
if (!isValidSeedId(seedId)) fail(`invalid --seed-id: ${seedId}`);
for (const pair of setPairs) {
  const eq = pair.indexOf("=");
  if (eq < 0) fail(`--set expects key=value, got "${pair}"`);
  const key = pair.slice(0, eq);
  if (key === "design_lane" || key.startsWith("design_lane.")) {
    fail("design_lane is init-time immutable; to cross a design-lock stop, record the Shane-authored release row (event='stop-line-released', status='passed')");
  }
}
const runRel = runRelFor(seedId);
const coerce = (v) => { try { return JSON.parse(v); } catch { return v; } };
const setUpdates = [];
for (const pair of setPairs) {
  const eq = pair.indexOf("=");
  const key = pair.slice(0, eq);
  setUpdates.push([key, coerce(pair.slice(eq + 1))]);
}
const appendUpdates = [];
for (const pair of multi("append")) {
  const eq = pair.indexOf("=");
  if (eq < 0) fail(`--append expects key=value, got "${pair}"`);
  const key = pair.slice(0, eq);
  appendUpdates.push([key, coerce(pair.slice(eq + 1))]);
}

let receipt;
try {
  receipt = advanceRun(process.cwd(), seedId, {
    to, event, status, actor, lane, note, resumeArtifact, dryRun,
    updates: { set: setUpdates, append: appendUpdates }
  });
} catch (e) {
  if (e.code === "RUN_NOT_FOUND") fail(`no run at ${runRel}`);
  if (e.code === "MANIFEST_REJECTED") fail(`manifest rejected: ${e.message}`);
  if (["LEDGER_REJECTED", "LEDGER_INVALID"].includes(e.code)) {
    fail(`ledger invalid:\n  ${(e.errors || [e.message]).join("\n  ")}`);
  }
  fail(e.message);
}
if (dryRun) console.log(JSON.stringify(receipt, null, 2));
else console.log(`[advance-run] ${receipt.from} -> ${receipt.to} (${event}/${status}) — ${runRel}`);
