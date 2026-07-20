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
// Dependency-free outside local policy modules: studio-paths discovers the pack
// root and portfolio-memory enforces the intake evidence gate on advancement.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { validate } from "./validate-json-schema.mjs";
import { findStudioRoot } from "./studio-paths.mjs";
import { isPortfolioRun, openPortfolio } from "./portfolio-memory.mjs";
import {
  SEED_ID_RE, extractFencedJson, isValidSeedId
} from "./run-artifact-identity.mjs";

export { SEED_ID_RE, extractFencedJson, isValidSeedId };

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUN_TRANSACTION_FILE = "run-state-transaction.json";

// --- Identity & paths ---

export function runDirFor(cwd, seedId) {
  return path.resolve(cwd, ".tgf", "seeds", seedId);
}
export function runRelFor(seedId) {
  return path.join(".tgf", "seeds", seedId);
}
// Default export destination for a finished spec pack:
// $STUDIO_ROOT/games/_export-{seed-id} (two-dir studio shape: export pack here,
// forge intake births games/{seed-id}). Declared, never created until an
// explicit package-spec step. package-spec --to still wins over this default.
// Discovery: startDir → FACTORY_ROOT walk-up → STUDIO_ROOT env (via findStudioRoot).
export function specPackRootFor(seedId, startDir = process.cwd()) {
  const studio =
    findStudioRoot(startDir) || findStudioRoot(FACTORY_ROOT);
  if (!studio) {
    throw new Error(
      "cannot resolve STUDIO_ROOT for default pack root (set STUDIO_ROOT or run under a studio tree with DISCIPLINES.md)",
    );
  }
  return path.join(studio, "games", `_export-${seedId}`);
}

export function pathIsInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

export function firstSymlinkComponent(absPath) {
  let current = path.parse(absPath).root;
  for (const segment of path.relative(current, absPath).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) return current;
  }
  return null;
}

function nearestExistingPath(absPath) {
  let current = absPath;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

// Resolve a manifest-owned run artifact path and prove it stays inside
// `.tgf/seeds/{seed-id}`. This is intentionally stricter than "file exists": a
// manifest may not redirect thesis/ADR/playtest/review/handoff reads to another
// repository, `/tmp`, or a sibling seed.
export function resolveRunPath(cwd, seedId, manifestPath, label = "manifest path") {
  const runDir = runDirFor(cwd, seedId);
  const resolved = path.resolve(cwd, manifestPath);
  if (!pathIsInside(runDir, resolved)) {
    throw new Error(`${label} must resolve inside ${runRelFor(seedId)}: ${manifestPath}`);
  }
  const symlink = firstSymlinkComponent(resolved);
  if (symlink) {
    throw new Error(`${label} must not traverse symlink: ${path.relative(cwd, symlink) || symlink}`);
  }
  if (fs.existsSync(runDir)) {
    const realRunDir = fs.realpathSync.native(runDir);
    const existingTarget = nearestExistingPath(resolved);
    const realTarget = fs.realpathSync.native(existingTarget);
    if (!pathIsInside(realRunDir, realTarget)) {
      throw new Error(`${label} must resolve inside ${runRelFor(seedId)}: ${manifestPath}`);
    }
  }
  return resolved;
}

function openNoFollow(file, flags, mode = 0o666) {
  return fs.openSync(file, flags | (fs.constants.O_NOFOLLOW || 0), mode);
}

function readFileNoFollow(file, cwd = process.cwd()) {
  const symlink = firstSymlinkComponent(file);
  if (symlink) {
    throw new Error(`path must not traverse symlink: ${path.relative(cwd, symlink) || symlink}`);
  }
  let fd;
  try {
    fd = openNoFollow(file, fs.constants.O_RDONLY);
    return fs.readFileSync(fd, "utf8");
  } catch (e) {
    if (e.code === "ELOOP") throw new Error(`path must not be a symlink: ${path.relative(cwd, file) || file}`);
    throw e;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

export function writeRunFileSync(cwd, seedId, runPath, contents) {
  const file = resolveRunPath(cwd, seedId, runPath, runPath);
  let fd;
  try {
    fd = openNoFollow(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC);
    fs.writeFileSync(fd, contents);
  } catch (e) {
    if (e.code === "ELOOP") throw new Error(`${runPath} must not be a symlink`);
    throw e;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

export function appendRunFileSync(cwd, seedId, runPath, contents) {
  const file = resolveRunPath(cwd, seedId, runPath, runPath);
  let fd;
  try {
    fd = openNoFollow(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND);
    fs.writeFileSync(fd, contents);
  } catch (e) {
    if (e.code === "ELOOP") throw new Error(`${runPath} must not be a symlink`);
    throw e;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// Complete-file replacement for paired run truth. The temp file is fully written
// before rename, so neither the manifest nor ledger can be left partially written.
function replaceRunFileSync(cwd, seedId, runPath, contents) {
  const file = resolveRunPath(cwd, seedId, runPath, runPath);
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`);
  let fd;
  try {
    fd = openNoFollow(temp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL);
    fs.writeFileSync(fd, contents);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temp, file);
  } catch (error) {
    if (error.code === "ELOOP") throw new Error(`${runPath} must not be a symlink`);
    throw error;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

function removeRunFileSync(cwd, seedId, runPath) {
  const file = resolveRunPath(cwd, seedId, runPath, runPath);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// The subdirectories every run dir carries. The initializer creates them and the
// symlink guard inspects them — one list so the two cannot drift.
export const RUN_DIRS = ["decisions", "reviews", "issues"];

// The files/dirs the initializer owns inside a run dir — the only paths `--force`
// may rewrite, and the only paths the symlink guard inspects.
function ownedRunPaths(runDir) {
  return [
    runDir,
    ...RUN_DIRS.map((d) => path.join(runDir, d)),
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

// --- Document artifacts that carry a canonical JSON block ---
//
// GAME_THESIS.md and decisions/NNNN-engine-*.md are human-readable markdown that
// each embed exactly one fenced ```json block — the machine-checkable object the
// factory's schema describes. This keeps one named, diffable, reviewable artifact
// that is *also* schema-validatable, so "must validate against schemas/…" is a real
// check, not prose. The prompts (P01/P02) and skills declare the convention.
// Read, parse, and schema-validate a markdown artifact's embedded JSON block in
// one pass. Returns { obj, errors }: obj is the parsed block when it validates,
// null otherwise. Callers that need both the verdict and the object use this so
// the file is read once, not validated and then re-read.
// Pre-refresh free-string feel_targets / acceptance are not migratable (SPEC §3.3).
// Detect the old shape and point operators at re-running the authoring phases.
function preRefreshShapeHints(schemaName, obj) {
  if (!obj || typeof obj !== "object") return [];
  if (schemaName === "game-thesis" && Array.isArray(obj.feel_targets)
      && obj.feel_targets.some((t) => typeof t === "string")) {
    return [
      "game-thesis: feel_targets uses pre-refresh free-string shape; re-run the thesis phase (P01) — no migration shim (SPEC §3.3 / T05)"
    ];
  }
  if (schemaName === "spec-decomposition" && Array.isArray(obj.slices)) {
    for (const s of obj.slices) {
      if (Array.isArray(s.acceptance) && s.acceptance.some((a) => typeof a === "string")) {
        return [
          "spec-decomposition: acceptance uses pre-refresh free-string shape; re-run the decompose phase (P18) — no migration shim (SPEC §3.3 / T05)"
        ];
      }
    }
  }
  return [];
}

export function readEmbeddedArtifact(filePath, schemaName) {
  if (!fs.existsSync(filePath)) return { obj: null, errors: [`file missing: ${filePath}`] };
  const { obj, error } = extractFencedJson(fs.readFileSync(filePath, "utf8"));
  if (error) return { obj: null, errors: [error] };
  const errors = validate(loadSchema(schemaName), obj);
  if (errors.length) {
    return { obj: null, errors: [...errors, ...preRefreshShapeHints(schemaName, obj)] };
  }
  return { obj, errors: [] };
}

// Validate the JSON block embedded in a markdown artifact against a named schema.
// Returns an array of error strings ([] = valid).
export function validateEmbeddedJson(filePath, schemaName) {
  return readEmbeddedArtifact(filePath, schemaName).errors;
}

// --- Reading (crash-safe: a malformed file is reported, never thrown to the caller) ---

function assertNoPendingRunTransaction(runDir, cwd) {
  const transactionFile = path.join(runDir, RUN_TRANSACTION_FILE);
  if (!fs.existsSync(transactionFile)) return;
  const reject = (message) => {
    const error = new Error(message);
    error.code = "RUN_REPAIR_REQUIRED";
    throw error;
  };
  try { readFileNoFollow(transactionFile, cwd); }
  catch (error) {
    reject(`pending run-state transaction requires repair but its note is unreadable: ${error.message}`);
  }
  reject(`pending run-state transaction requires repair: ${path.relative(cwd, transactionFile)}`);
}

export function readManifest(runDir, seedId = null, cwd = process.cwd()) {
  assertNoPendingRunTransaction(runDir, cwd);
  const p = path.join(runDir, "manifest.json");
  if (!fs.existsSync(p)) return null;
  const manifest = JSON.parse(readFileNoFollow(p, cwd));
  if (seedId && manifest.seed_id !== seedId) {
    throw new Error(`manifest seed_id '${manifest.seed_id}' does not match '${seedId}'`);
  }
  return manifest;
}

// Returns { rows, parseErrors }. A bad JSONL line is recorded in parseErrors and
// skipped, so a single corrupt row never crashes a summary or a validation pass.
export function readLedger(runDir, seedId = null, cwd = process.cwd()) {
  const p = path.join(runDir, "execution-ledger.jsonl");
  const rows = [];
  const parseErrors = [];
  if (!fs.existsSync(p)) return { rows, parseErrors };
  readFileNoFollow(p, cwd).split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    try {
      const row = JSON.parse(line);
      if (seedId && row.seed_id !== seedId) {
        parseErrors.push(`execution-ledger.jsonl line ${i + 1}: seed_id '${row.seed_id}' does not match '${seedId}'`);
      }
      rows.push(row);
    }
    catch { parseErrors.push(`execution-ledger.jsonl line ${i + 1}: not valid JSON`); }
  });
  return { rows, parseErrors };
}

export class RunStateError extends Error {
  constructor(message, code = "RUN_INVALID", errors = []) {
    super(message);
    this.name = "RunStateError";
    this.code = code;
    this.errors = errors;
  }
}

// Open one coherent view of a run. Callers receive validated manifest + ledger
// truth and common derivations together, or one rejection containing every
// structural/reconciliation error found in that snapshot.
export function openRun(cwd, seedId) {
  if (!isValidSeedId(seedId)) {
    throw new RunStateError(`invalid --seed-id: ${seedId}`, "INVALID_SEED_ID");
  }
  const runDir = runDirFor(cwd, seedId);
  const runRel = runRelFor(seedId);
  let manifest;
  try { manifest = readManifest(runDir, seedId, cwd); }
  catch (error) {
    throw new RunStateError(error.message, error.code || "MANIFEST_REJECTED", [error.message]);
  }
  if (!manifest) {
    throw new RunStateError(`no run at ${runRel}`, "RUN_NOT_FOUND");
  }

  let ledger;
  try { ledger = readLedger(runDir, seedId, cwd); }
  catch (error) {
    throw new RunStateError(error.message, "LEDGER_REJECTED", [error.message]);
  }
  const manifestErrors = [
    ...validateManifest(manifest).map((error) => `manifest ${error}`),
    ...manifestPathPolicyErrors(manifest, seedId, cwd),
    ...phaseArtifactConstraintErrors(manifest),
    ...questionBudgetErrors(manifest),
    ...deepenAttemptErrors(manifest)
  ];
  if (manifest.external_side_effects_allowed !== false) {
    manifestErrors.push("external_side_effects_allowed must be false");
  }
  const ledgerErrors = ledger.parseErrors.map((error) => `ledger ${error}`);
  ledger.rows.forEach((row, index) => {
    validateLedgerRow(row).forEach((error) => ledgerErrors.push(`ledger row ${index + 1} ${error}`));
  });
  if (!ledger.rows.length) ledgerErrors.push("execution-ledger.jsonl missing or empty");
  ledgerTransitionErrors(ledger.rows).forEach((error) => ledgerErrors.push(error));

  const reconciliationErrors = designLaneConsistencyErrors(manifest, ledger.rows);
  const latestEvent = ledger.rows[ledger.rows.length - 1] || null;
  if (latestEvent?.phase !== undefined && latestEvent.phase !== manifest.current_phase) {
    reconciliationErrors.push(`manifest current_phase '${manifest.current_phase}' != latest ledger phase '${latestEvent.phase}'`);
  }
  const errors = [...manifestErrors, ...ledgerErrors, ...reconciliationErrors];
  if (errors.length) {
    const code = manifestErrors.length === 0 && reconciliationErrors.length === 0
      ? "LEDGER_INVALID"
      : "RUN_INVALID";
    throw new RunStateError(errors.join("\n"), code, errors);
  }

  const revisionRows = ledger.rows.filter(
    (row) => row.event === "spec-pack-revision-exported" && row.status === "passed"
  );
  const exportStatus = {
    kind: manifest.spec_pack_path ? "default" : (revisionRows.length ? "revision" : "none"),
    revision_count: revisionRows.length,
    path: manifest.spec_pack_path || null
  };
  return {
    cwd,
    seedId,
    runDir,
    runRel,
    manifest,
    ledgerRows: ledger.rows,
    latestEvent,
    exportStatus,
    phase: {
      current: manifest.current_phase,
      terminal: TERMINAL_PHASES.includes(manifest.current_phase),
      legal_next: legalNextPhases(manifest.current_phase)
    }
  };
}

// --- Path policy ---

// The only absolute path a manifest may contain is its own default_spec_pack_root,
// which must equal $STUDIO_ROOT/games/_export-{seed-id} (export root; forge
// intake then births games/{seed-id}). This keeps a run from pointing writes at
// source repos or anywhere outside its declared sandbox.
export function manifestPathPolicyErrors(manifest, seedId, cwd = process.cwd()) {
  const errors = [];
  const specPackRoot = specPackRootFor(seedId, cwd);
  const absPaths = JSON.stringify(manifest).match(/\/home\/ark\/[A-Za-z0-9._/-]+/g) || [];
  for (const p of absPaths) if (p !== specPackRoot) errors.push(`illegal absolute source path in manifest: ${p}`);
  if (manifest.default_spec_pack_root !== specPackRoot) {
    errors.push(`default_spec_pack_root must be ${specPackRoot}`);
  }
  const runPathFields = [
    ["seed_path", manifest.seed_path],
    ["game_thesis_path", manifest.game_thesis_path],
    ["engine_decision_path", manifest.engine_decision_path],
    ["spec_path", manifest.spec_path],
    ["execution_ledger_path", manifest.execution_ledger_path],
    ["resume_point.artifact_path", manifest.resume_point?.artifact_path],
    ...((manifest.review_report_paths || []).map((p, i) => [`review_report_paths[${i}]`, p])),
    ...((manifest.handoff_paths || []).map((p, i) => [`handoff_paths[${i}]`, p]))
  ];
  for (const [label, value] of runPathFields) {
    if (value == null || typeof value !== "string") continue;
    try { resolveRunPath(cwd, seedId, value, label); }
    catch (e) { errors.push(e.message); }
  }
  if (manifest.spec_pack_path) {
    const packPath = path.resolve(manifest.spec_pack_path);
    if (!pathIsInside(specPackRoot, packPath)) {
      errors.push(`spec_pack_path must resolve inside ${specPackRoot}: ${manifest.spec_pack_path}`);
    }
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
// its machine-readable form. `deepen` re-enters thesis (one named transform, ≤2 tries);
// design-review ADVANCE is the design-lock that opens engine-profile → decompose.
const FORWARD = {
  intake: ["toolchain"],
  toolchain: ["thesis"],
  thesis: ["design-review"],
  "design-review": ["engine-profile", "deepen"],
  deepen: ["thesis"],
  "engine-profile": ["decompose"],
  decompose: ["handoff"],
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
  "intake", "toolchain", "thesis", "design-review", "deepen",
  "engine-profile", "decompose", "handoff"
];

// Phases a run can only legitimately occupy after a design-review ADVANCE
// (design-lock). Derived from the spine so the list cannot drift from the phase
// machine: everything past design-review except `deepen` (the failed-gate path),
// plus the terminal `complete`. Validators gate these on a passing depth vector.
export const DESIGN_LOCKED_PHASES = [
  ...SPINE.slice(SPINE.indexOf("design-review") + 1).filter((p) => p !== "deepen"),
  "complete"
];

// True when `phase` is strictly past `marker` on the spine (so the phase that
// *produces* an artifact is not yet required to have it, only later phases are).
function isPastPhase(phase, marker) {
  const a = SPINE.indexOf(phase);
  const b = SPINE.indexOf(marker);
  return a >= 0 && b >= 0 && a > b;
}

// Doctrine ("No decomposition before GAME_THESIS.md"; ADR 0002 "engine choice is
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
  if (isPastPhase(phase, "decompose") && !manifest.spec_path) {
    errors.push(`current_phase '${phase}' is past 'decompose' but spec_path is null`);
  }
  return errors;
}

// Doctrine: recorded AFK questions before decomposition are lane-budgeted. A
// lane-aware yolo run allows none; grill and legacy manifests retain the existing
// one-question ceiling (factory.config.toml human_questions_max_before_decompose).
// Live collaborative grill dialogue is not recorded in this AFK budget.
const BEFORE_DECOMPOSE = ["intake", "toolchain", "thesis", "design-review", "deepen", "engine-profile", "decompose"];
export function questionBudgetErrors(manifest) {
  const asked = Array.isArray(manifest.questions_asked) ? manifest.questions_asked.length : 0;
  if (!BEFORE_DECOMPOSE.includes(manifest.current_phase)) return [];
  const max = manifest.design_lane?.mode === "yolo" ? 0 : 1;
  if (asked > max) {
    return [`questions_asked=${asked} but design lane '${manifest.design_lane?.mode || "legacy"}' allows at most ${max} recorded question${max === 1 ? "" : "s"} before the spec is decomposed`];
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

// ADR 0012: the manifest lane is anchored in the initialization row. Only an
// owner-authored row can change it, and neither a lane change nor a stop-line
// release can retroactively authorize the first downstream crossing.
export function designLaneConsistencyErrors(manifest, ledgerRows) {
  const errors = [];
  const rows = Array.isArray(ledgerRows) ? ledgerRows : [];
  const firstCrossing = rows.findIndex((row) => ["decompose", "handoff", "complete"].includes(row?.phase));
  const lanePrefix = "design_lane:";
  const laneFromRow = (row) => {
    if (typeof row?.lane !== "string" || !row.lane.startsWith(lanePrefix)) return null;
    try { return { value: JSON.parse(row.lane.slice(lanePrefix.length)) }; }
    catch (error) { return { error: error.message }; }
  };
  const canonicalLane = (lane) => lane && typeof lane === "object"
    ? JSON.stringify({ mode: lane.mode, stop_line: lane.stop_line, origination: lane.origination })
    : null;
  const initIndex = rows.findIndex((row) => row?.event === "run-initialized");
  const initLane = initIndex >= 0 ? laneFromRow(rows[initIndex]) : null;
  if (initLane?.error) {
    errors.push(`run-initialized design_lane anchor is invalid JSON: ${initLane.error}`);
  } else if (initLane) {
    const currentLane = canonicalLane(manifest?.design_lane);
    const anchoredLane = canonicalLane(initLane.value);
    if (currentLane !== anchoredLane) {
      const removesDesignLock = initLane.value?.stop_line === "design-lock"
        && manifest?.design_lane?.stop_line !== "design-lock";
      const authorizationEnd = removesDesignLock && firstCrossing >= 0 ? firstCrossing : rows.length;
      const authorized = currentLane !== null && rows.slice(initIndex + 1, authorizationEnd).some((row) => {
        if (row.event !== "lane-changed" || row.status !== "passed" || row.actor !== "Shane") return false;
        const stated = laneFromRow(row);
        return stated && !stated.error && canonicalLane(stated.value) === currentLane;
      });
      if (!authorized) {
        errors.push("manifest design_lane drifted from the run-initialized ledger anchor without a prior Shane-authored lane-changed row (event='lane-changed', status='passed') stating the current lane");
      }
    }
  }

  if (manifest?.design_lane?.stop_line === "design-lock" && firstCrossing >= 0) {
    const released = firstCrossing > 0 && rows.slice(0, firstCrossing).some((row) =>
      row.phase === "engine-profile"
      && row.event === "stop-line-released"
      && row.status === "passed"
      && row.actor === "Shane"
    );
    if (!released) {
      errors.push("design_lane.stop_line 'design-lock' forbids progress past engine-profile without a prior Shane-authored ledger row (event='stop-line-released', status='passed')");
    }
  }
  return errors;
}

// Advance validated run truth from domain intent. A durable transaction note is
// written first, then ledger and manifest are replaced. A failed manifest write
// restores exact ledger bytes; if rollback cannot complete, future opens reject
// the run until the note is used to repair it.
export function advanceRun(cwd, seedId, intent, options = {}) {
  const run = openRun(cwd, seedId);
  const {
    to,
    event,
    status = "checkpointed",
    actor = "agent",
    lane = null,
    note = null,
    resumeArtifact = null,
    updates = {},
    dryRun = false
  } = intent || {};
  const from = run.manifest.current_phase;
  if (!to || !event) throw new RunStateError("advance intent requires to and event", "INVALID_INTENT");
  if (!isLegalTransition(from, to)) {
    throw new RunStateError(
      `illegal transition ${from} -> ${to}. legal next: ${legalNextPhases(from).join(", ") || "(none — terminal)"}`,
      "ILLEGAL_TRANSITION"
    );
  }
  if (from === "intake" && to === "toolchain" && isPortfolioRun(run.manifest)) {
    const intakeErrors = openPortfolio(cwd).readIntakeEvidence(run.runDir, seedId).errors;
    if (intakeErrors.length) {
      throw new RunStateError(`intake evidence invalid:\n  ${intakeErrors.join("\n  ")}`, "INTAKE_INVALID", intakeErrors);
    }
  }

  const now = options.now ?? new Date().toISOString();
  const iso = typeof now === "function" ? now() : now;
  const ledgerRow = { ts: iso, seed_id: seedId, phase: to, event, status, actor };
  if (lane) ledgerRow.lane = lane;

  const next = JSON.parse(JSON.stringify(run.manifest));
  next.current_phase = to;
  if (to === "deepen" && from !== "deepen") {
    next.deepen_attempt_count = Number(run.manifest.deepen_attempt_count || 0) + 1;
  }
  next.last_verified_at = iso;
  next.resume_point = {
    phase: to,
    artifact_path: resumeArtifact || run.manifest.resume_point?.artifact_path || `${run.runRel}/manifest.json`,
    reason: note || `advanced ${from} -> ${to} (${event})`
  };
  for (const [key, value] of updates.set || []) next[key] = value;
  for (const [key, value] of updates.append || []) {
    if (!Array.isArray(next[key])) next[key] = [];
    next[key].push(value);
  }

  const rowErrors = validateLedgerRow(ledgerRow);
  if (rowErrors.length) {
    throw new RunStateError(`ledger row invalid:\n  ${rowErrors.join("\n  ")}`, "LEDGER_ROW_INVALID", rowErrors);
  }
  const manifestErrors = [
    ...validateManifest(next).map((error) => `manifest ${error}`),
    ...manifestPathPolicyErrors(next, seedId, cwd),
    ...phaseArtifactConstraintErrors(next),
    ...questionBudgetErrors(next),
    ...deepenAttemptErrors(next),
    ...designLaneConsistencyErrors(next, [...run.ledgerRows, ledgerRow])
  ];
  if (manifestErrors.length) {
    throw new RunStateError(
      `resulting manifest invalid:\n  ${manifestErrors.join("\n  ")}`,
      "RESULT_INVALID",
      manifestErrors
    );
  }

  const receipt = {
    ok: true,
    mode: dryRun ? "dry-run" : "write",
    from,
    to,
    ledger_row: ledgerRow,
    manifest_after: next
  };
  if (dryRun) return receipt;

  const manifestRel = `${run.runRel}/manifest.json`;
  const ledgerRel = `${run.runRel}/execution-ledger.jsonl`;
  const ledgerFile = resolveRunPath(cwd, seedId, ledgerRel, ledgerRel);
  resolveRunPath(cwd, seedId, manifestRel, manifestRel);
  const ledgerBefore = readFileNoFollow(ledgerFile, cwd);
  const separator = ledgerBefore && !ledgerBefore.endsWith("\n") ? "\n" : "";
  const ledgerAfter = `${ledgerBefore}${separator}${JSON.stringify(ledgerRow)}\n`;
  const transactionRel = `${run.runRel}/${RUN_TRANSACTION_FILE}`;
  replaceRunFileSync(cwd, seedId, transactionRel, `${JSON.stringify({
    schema_version: "1.0.0",
    seed_id: seedId,
    manifest_path: manifestRel,
    ledger_path: ledgerRel,
    manifest_before: run.manifest,
    manifest_after: next,
    ledger_before: ledgerBefore,
    ledger_after: ledgerAfter
  }, null, 2)}\n`);
  const defaults = {
    writeLedger: (contents) => replaceRunFileSync(cwd, seedId, ledgerRel, contents),
    writeManifest: (contents) => replaceRunFileSync(cwd, seedId, manifestRel, contents),
    restoreLedger: (contents) => replaceRunFileSync(cwd, seedId, ledgerRel, contents)
  };
  const persistence = { ...defaults, ...(options.persistence || {}) };
  try {
    persistence.writeLedger(ledgerAfter);
  } catch (error) {
    // Ledger replacement failed before any truth mutated: the run is still
    // consistent, so the transaction note must not survive to block openRun.
    try { removeRunFileSync(cwd, seedId, transactionRel); }
    catch (cleanupError) {
      throw new RunStateError(
        `${error.message}; transaction cleanup failed: ${cleanupError.message}`,
        "PERSISTENCE_CLEANUP_FAILED"
      );
    }
    throw error;
  }
  try {
    persistence.writeManifest(`${JSON.stringify(next, null, 2)}\n`);
  } catch (error) {
    try { persistence.restoreLedger(ledgerBefore); }
    catch (rollbackError) {
      throw new RunStateError(
        `${error.message}; ledger rollback failed: ${rollbackError.message}`,
        "PERSISTENCE_ROLLBACK_FAILED"
      );
    }
    try { removeRunFileSync(cwd, seedId, transactionRel); }
    catch (cleanupError) {
      throw new RunStateError(
        `${error.message}; transaction cleanup failed: ${cleanupError.message}`,
        "PERSISTENCE_CLEANUP_FAILED"
      );
    }
    throw error;
  }
  removeRunFileSync(cwd, seedId, transactionRel);
  return receipt;
}
