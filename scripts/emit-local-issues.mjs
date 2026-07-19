#!/usr/bin/env node
// Render a seed's SPEC.md decomposition into local markdown issues — one issue per
// slice, written inside the seed run (.tgf/seeds/{id}/issues/). Deterministic
// renderer only: the slicing judgment lives in SPEC.md (P18_DECOMPOSE_SPEC), the
// shape lives in schemas/spec-decomposition, and this module just materializes it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  runDirFor, runRelFor, readManifest, readEmbeddedArtifact,
  isValidSeedId, resolveRunPath, writeRunFileSync
} from "./lib/run-state.mjs";
import { specConsistencyErrors } from "./lib/spec-decomposition.mjs";
import { frontMatterAccessors } from "./lib/issue-format.mjs";
import { arg, hasFlag } from "./lib/argv.mjs";
import { ARTIFACT_KINDS } from "./lib/factory-contract.mjs";

function frontMatterScalar(value) {
  const normalized = String(value ?? "")
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || "(empty)";
}
const quoted = (value) => `'${frontMatterScalar(value).replaceAll("'", "''")}'`;
const yamlList = (items) => items.length ? items.map((item) => `  - ${quoted(item)}`).join("\n") : "";

function formatAcceptanceLine(item) {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const kind = frontMatterScalar(item.kind);
    const statement = frontMatterScalar(item.statement);
    const check = frontMatterScalar(item.check);
    return `[${kind}] ${statement} (check: ${check})`;
  }
  return frontMatterScalar(item);
}

const EVIDENCE = ["SPEC.md", "GAME_THESIS.md", "decisions/0001-engine-profile.md"];

function issueMarkdown(slice, engine, spec) {
  const blocked = (slice.depends_on || []).length > 0;
  const state = blocked ? "needs-info" : "ready-for-agent";
  const afk = blocked ? "needs-human" : "ready-for-agent";
  const acceptanceLines = (slice.acceptance || []).map(formatAcceptanceLine);
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
    yamlList(acceptanceLines),
    "evidence:",
    yamlList(EVIDENCE),
    "---"
  ].filter((line) => line !== "").join("\n");
  const acceptanceBody = (slice.acceptance || []).length
    ? [
        "",
        "Acceptance criteria (structured):",
        ...(slice.acceptance || []).map((item) => {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            return `- kind: ${frontMatterScalar(item.kind)}\n  statement: ${frontMatterScalar(item.statement)}\n  check: ${frontMatterScalar(item.check)}`;
          }
          return `- ${formatAcceptanceLine(item)}`;
        })
      ].join("\n")
    : null;
  const body = [
    `Goal: ${slice.goal}`,
    "",
    `Chosen engine profile: ${engine.profile || engine.decision || "see decisions/0001-engine-profile.md"}`,
    (slice.loop_verbs_covered || []).length
      ? `Core loop verbs exercised: ${slice.loop_verbs_covered.join(", ")}`
      : null,
    acceptanceBody,
    (slice.evidence_requirements || []).length
      ? `\nEvidence this slice must produce:\n${slice.evidence_requirements.map((item) => `- ${item}`).join("\n")}`
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

function generatedIssueErrors({ id, content }) {
  const errors = [];
  const lines = content.split("\n");
  if (lines[0] !== "---") return [`${id}: missing opening YAML front matter delimiter`];
  const closing = lines.indexOf("---", 1);
  if (closing < 0) return [`${id}: missing closing YAML front matter delimiter`];
  if (lines.indexOf("---", closing + 1) >= 0) {
    errors.push(`${id}: generated issue contains an extra YAML front matter delimiter`);
  }
  const { field, hasKey, listItems } = frontMatterAccessors(lines.slice(1, closing).join("\n"));
  if (field("id") !== id) errors.push(`${id}: id must match generated issue id`);
  for (const required of ["title", "type", "state", "afk"]) {
    if (!field(required)) errors.push(`${id}: missing generated front-matter key '${required}'`);
  }
  for (const required of ["acceptance", "evidence"]) {
    if (!hasKey(required)) errors.push(`${id}: missing generated front-matter key '${required}'`);
  }
  if (hasKey("acceptance") && listItems("acceptance").length === 0) {
    errors.push(`${id}: generated acceptance list is empty`);
  }
  if (field("state") === "ready-for-agent" && listItems("evidence").length === 0) {
    errors.push(`${id}: ready-for-agent issue lacks generated evidence links`);
  }
  return errors;
}

function blockedPlan(startDir, seedId, runDir, runRel, blocker) {
  return { startDir, seedId, runDir, runRel, blockers: [blocker], documents: [] };
}

export function planIssues(startDir, seedId) {
  if (!isValidSeedId(seedId)) throw new Error(`invalid --seed-id: ${seedId}`);
  const root = path.resolve(startDir);
  const runDir = runDirFor(root, seedId);
  const runRel = runRelFor(seedId);
  let manifest;
  try { manifest = readManifest(runDir, seedId, root); }
  catch (error) { throw new Error(`manifest rejected: ${error.message}`); }
  if (!manifest) return blockedPlan(root, seedId, runDir, runRel, `no run at ${runRel}`);
  if (!manifest.game_thesis_path) {
    return blockedPlan(root, seedId, runDir, runRel, "Backlog decomposition is blocked until GAME_THESIS.md validates; refusing to emit issues before GAME_THESIS.md exists.");
  }
  if (!manifest.engine_decision_path) {
    return blockedPlan(root, seedId, runDir, runRel, "Backlog decomposition is blocked until an engine decision validates; refusing to emit issues before an engine decision exists.");
  }
  if (!manifest.spec_path) {
    return blockedPlan(root, seedId, runDir, runRel, "Backlog decomposition is blocked until SPEC.md validates (run the decompose phase); refusing to emit issues before SPEC.md exists.");
  }

  const artifacts = {};
  for (const [kind, { manifestKey, schemaName }] of Object.entries(ARTIFACT_KINDS)) {
    let file;
    try { file = resolveRunPath(root, seedId, manifest[manifestKey], manifestKey); }
    catch (error) { throw error; }
    const { obj, errors } = readEmbeddedArtifact(file, schemaName);
    if (errors.length) {
      return blockedPlan(root, seedId, runDir, runRel, `${kind} artifact invalid:\n  ${errors.join("\n  ")}`);
    }
    artifacts[kind] = obj;
  }
  const { thesis, engine, spec } = artifacts;
  if (engine.status !== "accepted") {
    return blockedPlan(root, seedId, runDir, runRel, `Backlog decomposition is blocked until the engine decision is accepted; current status is ${engine.status}. engine decision must be accepted before emitting issues.`);
  }
  if (engine.seed_id !== seedId) {
    return blockedPlan(root, seedId, runDir, runRel, `Backlog decomposition is blocked because engine decision seed_id '${engine.seed_id}' does not match --seed-id '${seedId}'.`);
  }
  if (spec.seed_id !== seedId) {
    return blockedPlan(root, seedId, runDir, runRel, `Backlog decomposition is blocked because spec seed_id '${spec.seed_id}' does not match --seed-id '${seedId}'.`);
  }
  const consistencyErrors = specConsistencyErrors(spec, thesis);
  if (consistencyErrors.length) {
    return blockedPlan(root, seedId, runDir, runRel, `spec decomposition inconsistent:\n  ${consistencyErrors.join("\n  ")}`);
  }

  const documents = [...spec.slices]
    .sort((a, b) => a.order - b.order)
    .map((slice) => ({
      id: slice.id,
      path: `${runRel}/issues/${slice.id}.md`,
      content: issueMarkdown(slice, engine, spec)
    }));
  const generatedErrors = documents.flatMap(generatedIssueErrors);
  if (generatedErrors.length) {
    return blockedPlan(root, seedId, runDir, runRel, `generated issue markdown invalid:\n  ${generatedErrors.join("\n  ")}`);
  }
  return { startDir: root, seedId, runDir, runRel, blockers: [], documents };
}

export function emitIssues(plan, { force = false } = {}) {
  if (!plan || !Array.isArray(plan.blockers) || !Array.isArray(plan.documents)) {
    throw new Error("emitIssues requires a structured issue plan");
  }
  if (plan.blockers.length) throw new Error(plan.blockers.join("\n"));
  for (const document of plan.documents) {
    const file = resolveRunPath(plan.startDir, plan.seedId, document.path, document.path);
    if (fs.existsSync(file) && !force) {
      throw new Error(`${path.relative(plan.startDir, file)} exists; pass --force to overwrite`);
    }
  }
  fs.mkdirSync(path.join(plan.runDir, "issues"), { recursive: true });
  const writtenPaths = [];
  for (const document of plan.documents) {
    writeRunFileSync(plan.startDir, plan.seedId, document.path, document.content);
    writtenPaths.push(document.path);
  }
  return { writtenPaths };
}

export function formatIssuePlan(plan, { write = false } = {}) {
  if (plan.blockers.length) return plan.blockers.join("\n");
  const lines = [
    write ? `# Local issues planned for ${plan.seedId}` : `# Dry-run local issues for ${plan.seedId}`,
    write
      ? "# --write-issues will create these files after run-owned writes preflight."
      : `# Re-run with --write to create files under ${plan.runRel}/issues.`
  ];
  for (const document of plan.documents) {
    lines.push("", `--- ${document.path} ---`, document.content.trimEnd());
  }
  return lines.join("\n");
}

function fail(message) {
  console.error(`[emit-local-issues] ERROR: ${message}`);
  process.exitCode = 1;
}

function main() {
  const seedId = arg("seed-id");
  const write = hasFlag("write");
  const force = hasFlag("force");
  if (!seedId) {
    fail("usage: --seed-id <id> [--write] [--force]");
    return;
  }
  let plan;
  try { plan = planIssues(process.cwd(), seedId); }
  catch (error) {
    fail(error.message);
    return;
  }
  if (plan.blockers.length) {
    fail(plan.blockers.join("\n"));
    return;
  }
  if (!write) {
    console.log(formatIssuePlan(plan));
    return;
  }
  try {
    const { writtenPaths } = emitIssues(plan, { force });
    for (const writtenPath of writtenPaths) console.log(`[emit-local-issues] wrote ${writtenPath}`);
  } catch (error) {
    fail(error.message);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
