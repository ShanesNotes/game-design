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
// Dependency-free (Node built-ins + the local JSON-schema validator) by design —
// except studio-paths for path-registry pack root discovery.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate-json-schema.mjs";
import { findStudioRoot } from "./studio-paths.mjs";

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
// Default export destination for a finished spec pack: $STUDIO_ROOT/games/{seed-id}
// (path-registry). Declared, never created until an explicit package-spec step.
// package-spec --to still wins over this default.
// Discovery: startDir → FACTORY_ROOT walk-up → STUDIO_ROOT env (via findStudioRoot).
export function specPackRootFor(seedId, startDir = process.cwd()) {
  const studio =
    findStudioRoot(startDir) || findStudioRoot(FACTORY_ROOT);
  if (!studio) {
    throw new Error(
      "cannot resolve STUDIO_ROOT for default pack root (set STUDIO_ROOT or run under a studio tree with DISCIPLINES.md)",
    );
  }
  return path.join(studio, "games", seedId);
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
export function extractFencedJson(text) {
  const m = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!m) return { obj: null, error: "no fenced ```json block found" };
  try { return { obj: JSON.parse(m[1]), error: null }; }
  catch (e) { return { obj: null, error: `embedded json is not parseable: ${e.message}` }; }
}

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

export function readManifest(runDir, seedId = null, cwd = process.cwd()) {
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

// --- Path policy ---

// The only absolute path a manifest may contain is its own default_spec_pack_root,
// which must equal $STUDIO_ROOT/games/{seed-id} (path-registry). This keeps a run
// from pointing writes at source repos or anywhere outside its declared sandbox.
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

// Doctrine: at most one direction-changing taste question before the spec is
// decomposed (factory.config.toml human_questions_max_before_decompose). Returns
// error strings.
const BEFORE_DECOMPOSE = ["thesis", "design-review", "deepen", "engine-profile", "decompose"];
export function questionBudgetErrors(manifest) {
  const asked = Array.isArray(manifest.questions_asked) ? manifest.questions_asked.length : 0;
  if (BEFORE_DECOMPOSE.includes(manifest.current_phase) && asked > 1) {
    return [`questions_asked=${asked} but at most 1 direction-changing question is allowed before the spec is decomposed`];
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
