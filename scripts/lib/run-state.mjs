// Deep module for one Tiny Game Factory seed run's on-disk state.
//
// Before this module, knowledge of a run was scattered: init-game-run.mjs,
// summarize-run.mjs, and validate-artifacts.mjs each re-derived the run directory,
// re-loaded schemas, re-implemented ledger parsing, and re-encoded the path policy.
// This concentrates all of it behind one small Interface so a run-state bug has one
// home. It owns: the seed-id rule, run/child paths, the set of owned files, schema
// validation of manifest + ledger rows, crash-safe manifest/ledger reading, the path
// policy that keeps a run pointed inside its sandbox, the symlink write-through guard,
// and the phase state machine derived from docs/doctrine.md §"Phase model".
//
// Dependency-free (Node built-ins + the local JSON-schema validator) by design.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate-json-schema.mjs";

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// --- Identity & paths ---

// The canonical seed-id rule. Mirrors schemas/seed-manifest.schema.json `pattern`.
export const SEED_ID_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
export function isValidSeedId(id) {
  return typeof id === "string" && SEED_ID_RE.test(id);
}

export function runDirFor(cwd, seedId) {
  return path.resolve(cwd, ".tgf", "seeds", seedId);
}
export function runRelFor(seedId) {
  return path.join(".tgf", "seeds", seedId);
}
export function childGameRootFor(seedId) {
  return `/home/ark/tgf-games/${seedId}`;
}

// The files/dirs the initializer owns inside a run dir — the only paths `--force`
// may rewrite, and the only paths the symlink guard inspects.
export function ownedRunPaths(runDir) {
  return [
    runDir,
    ...["decisions", "playtests", "reviews", "handoffs"].map((d) => path.join(runDir, d)),
    ...["manifest.json", "GAME_SEED.md", "README_AGENT_BOOT.md", "README_NEXT_ACTIONS.md", "execution-ledger.jsonl"]
      .map((f) => path.join(runDir, f))
  ];
}

// --- Schema validation (load once, here, not in every caller) ---

const schemaCache = {};
function loadSchema(name) {
  if (!schemaCache[name]) {
    schemaCache[name] = JSON.parse(fs.readFileSync(path.join(FACTORY_ROOT, "schemas", `${name}.schema.json`), "utf8"));
  }
  return schemaCache[name];
}
export function validateManifest(manifest) {
  return validate(loadSchema("seed-manifest"), manifest);
}
export function validateLedgerRow(row) {
  return validate(loadSchema("execution-ledger-row"), row);
}

// --- Reading (crash-safe: a malformed file is reported, never thrown to the caller) ---

export function readManifest(runDir) {
  const p = path.join(runDir, "manifest.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Returns { rows, parseErrors }. A bad JSONL line is recorded in parseErrors and
// skipped, so a single corrupt row never crashes a summary or a validation pass.
export function readLedger(runDir) {
  const p = path.join(runDir, "execution-ledger.jsonl");
  const rows = [];
  const parseErrors = [];
  if (!fs.existsSync(p)) return { rows, parseErrors };
  fs.readFileSync(p, "utf8").split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    try { rows.push(JSON.parse(line)); }
    catch { parseErrors.push(`execution-ledger.jsonl line ${i + 1}: not valid JSON`); }
  });
  return { rows, parseErrors };
}

// --- Path policy ---

// The only absolute /home/ark/... value a manifest may contain is its own
// default_child_game_root, which must equal /home/ark/tgf-games/{seed-id}. This keeps
// a run from pointing writes at source repos or anywhere outside its declared sandbox.
export function manifestPathPolicyErrors(manifest, seedId) {
  const errors = [];
  const childGameRoot = childGameRootFor(seedId);
  const absPaths = JSON.stringify(manifest).match(/\/home\/ark\/[A-Za-z0-9._/-]+/g) || [];
  for (const p of absPaths) if (p !== childGameRoot) errors.push(`illegal absolute source path in manifest: ${p}`);
  if (manifest.default_child_game_root !== childGameRoot) {
    errors.push(`default_child_game_root must be ${childGameRoot}`);
  }
  return errors;
}

// Returns the owned paths that are symlinks — writing through any of them would let
// `--force` escape the run dir to an outside target. Empty array means safe to write.
export function symlinkWriteThroughPaths(runDir) {
  return ownedRunPaths(runDir).filter((p) => fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink());
}

// --- Phase state machine (derived from docs/doctrine.md §"Phase model") ---

export const TERMINAL_PHASES = ["blocked", "failed", "killed", "complete"];

// Forward edges of the phase graph. docs/doctrine.md is the source of truth; this is
// its machine-readable form. `deepen` re-enters first-slice (one transform, ≤2 tries);
// solo runs may go depth-review→fun-lock without a bakeoff (lane policy default).
const FORWARD = {
  intake: ["toolchain"],
  toolchain: ["thesis"],
  thesis: ["engine-profile"],
  "engine-profile": ["prototype-dispatch"],
  "prototype-dispatch": ["first-slice"],
  "first-slice": ["depth-review"],
  "depth-review": ["bakeoff", "deepen", "fun-lock"],
  deepen: ["first-slice"],
  bakeoff: ["fun-lock", "deepen"],
  "fun-lock": ["content"],
  content: ["art"],
  art: ["polish"],
  polish: ["qa"],
  qa: ["release-candidate"],
  "release-candidate": ["handoff"],
  handoff: ["complete"]
};

export const ALL_PHASES = [...Object.keys(FORWARD), ...TERMINAL_PHASES.filter((p) => !(p in FORWARD))];

// Every non-terminal phase may also be interrupted into blocked/failed/killed; a
// blocked run may resume into any non-terminal phase with an evidence-backed ledger
// row; failed/killed/complete are absorbing.
export function legalNextPhases(phase) {
  if (phase === "blocked") return Object.keys(FORWARD);
  if (TERMINAL_PHASES.includes(phase)) return [];
  return [...(FORWARD[phase] || []), "blocked", "failed", "killed"];
}

export function isLegalTransition(from, to) {
  if (from === to) return true; // re-entrant checkpoint/event rows on the same phase
  return legalNextPhases(from).includes(to);
}

// Validate that the phase sequence recorded across ledger rows only uses legal
// transitions. Returns an array of error strings ([] = legal). A fresh single-row run
// has no transitions and is trivially legal.
export function ledgerTransitionErrors(rows) {
  const errors = [];
  const phases = rows.map((r) => r && r.phase).filter((p) => typeof p === "string");
  for (let i = 1; i < phases.length; i++) {
    if (!isLegalTransition(phases[i - 1], phases[i])) {
      errors.push(`illegal phase transition: ${phases[i - 1]} -> ${phases[i]} (row ${i + 1})`);
    }
  }
  return errors;
}

// --- Phase-gated artifact constraints (the manifest is the phase authority) ---

// Linear spine of the active phases, used to ask "is the run at or past phase X".
// Terminal phases (blocked/failed/killed/complete) are off-spine: a run may end at
// any point, so they are exempt from "must have produced artifact Y by now" rules.
const SPINE = [
  "intake", "toolchain", "thesis", "engine-profile", "prototype-dispatch",
  "first-slice", "depth-review", "bakeoff", "deepen", "fun-lock",
  "content", "art", "polish", "qa", "release-candidate", "handoff"
];

// True when `phase` is strictly past `marker` on the spine (so the phase that
// *produces* an artifact is not yet required to have it, only later phases are).
function isPastPhase(phase, marker) {
  const a = SPINE.indexOf(phase);
  const b = SPINE.indexOf(marker);
  return a >= 0 && b >= 0 && a > b;
}

// Doctrine ("No implementation before GAME_THESIS.md"; ADR 0002 "engine choice is
// recorded after the thesis") makes some manifest paths mandatory once their
// producing phase is behind us. Enforced one phase *after* production so the phase
// doing the work isn't required to have finished it. Returns error strings.
export function phaseArtifactConstraintErrors(manifest) {
  const errors = [];
  const phase = manifest.current_phase;
  if (isPastPhase(phase, "thesis") && !manifest.game_thesis_path) {
    errors.push(`current_phase '${phase}' is past 'thesis' but game_thesis_path is null`);
  }
  if (isPastPhase(phase, "engine-profile") && !manifest.engine_decision_path) {
    errors.push(`current_phase '${phase}' is past 'engine-profile' but engine_decision_path is null`);
  }
  return errors;
}

// Doctrine: at most one direction-changing taste question before the first slice
// (factory.config.toml human_questions_max_before_first_slice). Returns error strings.
const BEFORE_FIRST_SLICE = ["thesis", "engine-profile", "prototype-dispatch", "first-slice"];
export function questionBudgetErrors(manifest) {
  const asked = Array.isArray(manifest.questions_asked) ? manifest.questions_asked.length : 0;
  if (BEFORE_FIRST_SLICE.includes(manifest.current_phase) && asked > 1) {
    return [`questions_asked=${asked} but at most 1 direction-changing question is allowed before first-slice`];
  }
  return [];
}

// Doctrine: a DEEPEN loop gets at most two transform attempts, then it is killed.
export function deepenAttemptErrors(manifest) {
  const n = Number(manifest.deepen_attempt_count || 0);
  if (n > 2 && manifest.current_phase !== "killed") {
    return [`deepen_attempt_count=${n} exceeds the 2-attempt limit (the loop should be killed)`];
  }
  return [];
}
