#!/usr/bin/env node
// Render a seed's SPEC.md decomposition into local markdown issues — one issue per
// slice, written inside the seed run (.tgf/seeds/{id}/issues/). Deterministic
// renderer only: the slicing judgment lives in SPEC.md (P18_DECOMPOSE_SPEC), the
// shape lives in schemas/spec-decomposition, and this script just materializes it.
// Dry-run by default: it prints issue content and writes only when --write is
// explicit. Refuses before thesis + engine ADR + SPEC.md all exist and validate.
import fs from "node:fs";
import path from "node:path";
import {
  runDirFor, runRelFor, readManifest, readEmbeddedArtifact,
  isValidSeedId, resolveRunPath, writeRunFileSync
} from "./lib/run-state.mjs";
import { specConsistencyErrors } from "./lib/spec-decomposition.mjs";

function fail(msg) { console.error(`[emit-local-issues] ERROR: ${msg}`); process.exit(1); }

const argv = process.argv.slice(2);
function arg(name, defaultValue = null) { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : defaultValue; }
const seedId = arg("seed-id");
const write = argv.includes("--write");
const force = argv.includes("--force");

if (!seedId) fail("usage: --seed-id <id> [--write] [--force]");
if (!isValidSeedId(seedId)) fail(`invalid --seed-id: ${seedId}`);

const runDir = runDirFor(process.cwd(), seedId);
const runRel = runRelFor(seedId);
let manifest;
try { manifest = readManifest(runDir, seedId, process.cwd()); }
catch (e) { fail(`manifest rejected: ${e.message}`); }
if (!manifest) fail(`no run at ${runRel}`);
if (!manifest.game_thesis_path) fail("refusing to emit issues before GAME_THESIS.md exists");
if (!manifest.engine_decision_path) fail("refusing to emit issues before an engine decision exists");
if (!manifest.spec_path) fail("refusing to emit issues before SPEC.md exists (run the decompose phase first)");

let thesisPath; let enginePath; let specPath;
try {
  thesisPath = resolveRunPath(process.cwd(), seedId, manifest.game_thesis_path, "game_thesis_path");
  enginePath = resolveRunPath(process.cwd(), seedId, manifest.engine_decision_path, "engine_decision_path");
  specPath = resolveRunPath(process.cwd(), seedId, manifest.spec_path, "spec_path");
} catch (e) {
  fail(e.message);
}
const artifacts = {};
for (const [kind, file, schema] of [
  ["thesis", thesisPath, "game-thesis"],
  ["engine", enginePath, "engine-profile-decision"],
  ["spec", specPath, "spec-decomposition"]
]) {
  const { obj, errors } = readEmbeddedArtifact(file, schema);
  if (errors.length) fail(`${kind} artifact invalid:\n  ${errors.join("\n  ")}`);
  artifacts[kind] = obj;
}
const { thesis, engine, spec } = artifacts;
if (engine.status !== "accepted") {
  fail(`engine decision must be accepted before emitting issues, got ${engine.status}`);
}
if (engine.seed_id !== seedId) {
  fail(`engine decision seed_id '${engine.seed_id}' does not match --seed-id '${seedId}'`);
}
if (spec.seed_id !== seedId) {
  fail(`spec seed_id '${spec.seed_id}' does not match --seed-id '${seedId}'`);
}
const specErrors = specConsistencyErrors(spec, thesis);
if (specErrors.length) fail(`spec decomposition inconsistent:\n  ${specErrors.join("\n  ")}`);

// The local issue tracker uses a deliberately tiny YAML-front-matter subset.
// Keep generated scalars one physical line so schema-valid spec prose cannot
// accidentally inject a second front-matter delimiter (`---`) or truncate lists.
function frontMatterScalar(value) {
  const normalized = String(value ?? "")
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || "(empty)";
}
const quoted = (s) => `'${frontMatterScalar(s).replaceAll("'", "''")}'`;
const yamlList = (items) => items.length ? items.map((item) => `  - ${quoted(item)}`).join("\n") : "";

// Evidence links are pack-relative (resolvable from the run dir AND from an
// exported spec pack), never .tgf paths — those would be leakage in the pack.
const EVIDENCE = ["SPEC.md", "GAME_THESIS.md", "decisions/0001-engine-profile.md"];

function issueMarkdown(slice) {
  const blocked = (slice.depends_on || []).length > 0;
  const state = blocked ? "needs-info" : "ready-for-agent";
  const afk = blocked ? "needs-human" : "ready-for-agent";
  const front = [
    "---",
    `id: ${slice.id}`,
    `title: ${quoted(slice.title)}`,
    `type: ${slice.type}`,
    `state: ${state}`,
    `afk: ${afk}`,
    `order: ${slice.order}`,
    "depends_on:",
    yamlList(slice.depends_on || []),
    "acceptance:",
    yamlList(slice.acceptance),
    "evidence:",
    yamlList(EVIDENCE),
    "---"
  ].filter((line) => line !== "").join("\n");
  const body = [
    `Goal: ${slice.goal}`,
    "",
    `Chosen engine profile: ${engine.profile || engine.decision || "see decisions/0001-engine-profile.md"}`,
    (slice.loop_verbs_covered || []).length
      ? `Core loop verbs exercised: ${slice.loop_verbs_covered.join(", ")}`
      : null,
    (slice.evidence_requirements || []).length
      ? `\nEvidence this slice must produce:\n${slice.evidence_requirements.map((e) => `- ${e}`).join("\n")}`
      : null,
    blocked
      ? `\nBlocked on: ${slice.depends_on.join(", ")}. Move to ready-for-agent once their evidence exists.`
      : null,
    (spec.out_of_scope || []).length
      ? `\nOut of scope for this spec: ${spec.out_of_scope.join(", ")}.`
      : null
  ].filter((line) => line !== null).join("\n");
  return `${front}\n\n${body.trim()}\n`;
}

const slices = [...spec.slices].sort((a, b) => a.order - b.order);
const issues = slices.map((slice) => ({ id: slice.id, md: issueMarkdown(slice) }));

function generatedIssueErrors({ id, md }) {
  const errors = [];
  const lines = md.split("\n");
  if (lines[0] !== "---") return [`${id}: missing opening YAML front matter delimiter`];
  const closing = lines.indexOf("---", 1);
  if (closing < 0) return [`${id}: missing closing YAML front matter delimiter`];
  const extraDelimiter = lines.indexOf("---", closing + 1);
  if (extraDelimiter >= 0) {
    errors.push(`${id}: generated issue contains an extra YAML front matter delimiter`);
  }
  const front = lines.slice(1, closing).join("\n");
  const field = (k) => {
    const m = front.match(new RegExp(`^${k}:\\s*(.+)$`, "m"));
    return m ? m[1].trim() : null;
  };
  const hasKey = (k) => new RegExp(`^${k}:\\s*$`, "m").test(front) || field(k) !== null;
  const listItems = (k) => {
    const m = front.match(new RegExp(`^${k}:\\s*\\n((?:  - .+\\n?)*)`, "m"));
    return m ? m[1].split("\n").filter((line) => line.trim().startsWith("- ")).map((line) => line.trim().slice(2)) : [];
  };
  if (field("id") !== id) errors.push(`${id}: id must match generated issue id`);
  for (const req of ["title", "type", "state", "afk"]) {
    if (!field(req)) errors.push(`${id}: missing generated front-matter key '${req}'`);
  }
  for (const req of ["acceptance", "evidence"]) {
    if (!hasKey(req)) errors.push(`${id}: missing generated front-matter key '${req}'`);
  }
  if (hasKey("acceptance") && listItems("acceptance").length === 0) {
    errors.push(`${id}: generated acceptance list is empty`);
  }
  if (field("state") === "ready-for-agent" && listItems("evidence").length === 0) {
    errors.push(`${id}: ready-for-agent issue lacks generated evidence links`);
  }
  return errors;
}

const generatedErrors = issues.flatMap(generatedIssueErrors);
if (generatedErrors.length) fail(`generated issue markdown invalid:\n  ${generatedErrors.join("\n  ")}`);

const issueRel = (id) => `${runRel}/issues/${id}.md`;

if (!write) {
  console.log(`# Dry-run local issues for ${seedId}`);
  console.log(`# Re-run with --write to create files under ${runRel}/issues.`);
  for (const issue of issues) {
    console.log(`\n--- ${issueRel(issue.id)} ---`);
    console.log(issue.md.trimEnd());
  }
  process.exit(0);
}

// Preflight every write (existence, symlink, run confinement) before the first one,
// so a collision cannot leave a half-rendered backlog.
for (const issue of issues) {
  let file;
  // resolveRunPath also rejects symlinked components, including the file itself.
  try { file = resolveRunPath(process.cwd(), seedId, issueRel(issue.id), issueRel(issue.id)); }
  catch (e) { fail(e.message); }
  if (fs.existsSync(file) && !force) fail(`${path.relative(process.cwd(), file)} exists; pass --force to overwrite`);
}
fs.mkdirSync(path.join(runDir, "issues"), { recursive: true });
for (const issue of issues) {
  try { writeRunFileSync(process.cwd(), seedId, issueRel(issue.id), issue.md); }
  catch (e) { fail(e.message); }
  console.log(`[emit-local-issues] wrote ${issueRel(issue.id)}`);
}
