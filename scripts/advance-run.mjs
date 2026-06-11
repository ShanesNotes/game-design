#!/usr/bin/env node
// Advance one seed run to its next phase, atomically and legally. This is the
// write-side counterpart to summarize-run.mjs (read-side): both go through
// scripts/lib/run-state.mjs so the phase machine, schema validation, and path
// policy have one home. It refuses an illegal phase transition, appends a
// schema-valid ledger row, updates the manifest's current_phase / resume_point /
// last_verified_at, applies field edits (--set, --append), and re-validates the
// whole run before writing — so the manifest and ledger can never desync.
//
// Usage:
//   node scripts/advance-run.mjs --seed-id <id> --to <phase> --event <event>
//     [--status <ledger-status>] [--actor <name>] [--lane <lane>]
//     [--note <resume reason>] [--resume-artifact <path>]
//     [--set <key>=<jsonOrString> ...] [--append <key>=<value> ...] [--dry-run]
import {
  runDirFor, runRelFor, readManifest, readLedger, validateManifest, validateLedgerRow,
  manifestPathPolicyErrors, phaseArtifactConstraintErrors, isLegalTransition, legalNextPhases,
  isValidSeedId, writeRunFileSync, appendRunFileSync
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

if (!seedId || !to || !event) {
  fail('usage: --seed-id <id> --to <phase> --event <event> [--status] [--actor] [--lane] [--note] [--resume-artifact] [--set k=v] [--append k=v] [--dry-run]');
}
if (!isValidSeedId(seedId)) fail(`invalid --seed-id: ${seedId}`);

const runDir = runDirFor(process.cwd(), seedId);
const runRel = runRelFor(seedId);
let manifest;
try { manifest = readManifest(runDir, seedId, process.cwd()); } catch (e) { fail(`manifest rejected: ${e.message}`); }
if (!manifest) fail(`no run at ${runRel}`);
let currentLedger;
try { currentLedger = readLedger(runDir, seedId, process.cwd()); }
catch (e) { fail(`ledger rejected: ${e.message}`); }
if (currentLedger.parseErrors.length) fail(`ledger invalid:\n  ${currentLedger.parseErrors.join("\n  ")}`);
currentLedger.rows.forEach((row, i) => {
  const errors = validateLedgerRow(row);
  if (errors.length) fail(`ledger row ${i + 1} invalid:\n  ${errors.join("\n  ")}`);
});

const from = manifest.current_phase;
if (!isLegalTransition(from, to)) {
  fail(`illegal transition ${from} -> ${to}. legal next: ${legalNextPhases(from).join(", ") || "(none — terminal)"}`);
}

const iso = new Date().toISOString();
const ledgerRow = { ts: iso, seed_id: seedId, phase: to, event, status, actor };
if (lane) ledgerRow.lane = lane;

// Apply manifest edits on a clone, then validate before committing anything.
const next = JSON.parse(JSON.stringify(manifest));
next.current_phase = to;
next.last_verified_at = iso;
next.resume_point = {
  phase: to,
  artifact_path: resumeArtifact || manifest.resume_point?.artifact_path || `${runRel}/manifest.json`,
  reason: note || `advanced ${from} -> ${to} (${event})`
};

const coerce = (v) => { try { return JSON.parse(v); } catch { return v; } };
for (const pair of multi("set")) {
  const eq = pair.indexOf("=");
  if (eq < 0) fail(`--set expects key=value, got "${pair}"`);
  next[pair.slice(0, eq)] = coerce(pair.slice(eq + 1));
}
for (const pair of multi("append")) {
  const eq = pair.indexOf("=");
  if (eq < 0) fail(`--append expects key=value, got "${pair}"`);
  const key = pair.slice(0, eq);
  if (!Array.isArray(next[key])) next[key] = [];
  next[key].push(coerce(pair.slice(eq + 1)));
}

const rowErrors = validateLedgerRow(ledgerRow);
if (rowErrors.length) fail(`ledger row invalid:\n  ${rowErrors.join("\n  ")}`);
const manErrors = [
  ...validateManifest(next).map((e) => `manifest ${e}`),
  ...manifestPathPolicyErrors(next, seedId),
  ...phaseArtifactConstraintErrors(next)
];
if (manErrors.length) fail(`resulting manifest invalid:\n  ${manErrors.join("\n  ")}`);

if (dryRun) {
  console.log(JSON.stringify({ ok: true, mode: "dry-run", from, to, ledger_row: ledgerRow, manifest_after: next }, null, 2));
  process.exit(0);
}

try {
  writeRunFileSync(process.cwd(), seedId, `${runRel}/manifest.json`, JSON.stringify(next, null, 2) + "\n");
  appendRunFileSync(process.cwd(), seedId, `${runRel}/execution-ledger.jsonl`, JSON.stringify(ledgerRow) + "\n");
} catch (e) {
  fail(e.message);
}
console.log(`[advance-run] ${from} -> ${to} (${event}/${status}) — ${runRel}`);
