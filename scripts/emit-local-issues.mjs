#!/usr/bin/env node
// Translate a proven seed premise into local markdown issues. Dry-run by default:
// it prints `.tgf/issues/*.md` content and writes only when --write is explicit.
// Refuses before both GAME_THESIS.md and the engine ADR exist and validate.
import fs from "node:fs";
import path from "node:path";
import {
  runDirFor, readManifest, extractFencedJson, validateEmbeddedJson, isValidSeedId, resolveRunPath
} from "./lib/run-state.mjs";

function fail(msg) { console.error(`[emit-local-issues] ERROR: ${msg}`); process.exit(1); }

const argv = process.argv.slice(2);
function arg(name, defaultValue = null) { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : defaultValue; }
const seedId = arg("seed-id");
const outDir = arg("out-dir", ".tgf/issues");
const write = argv.includes("--write");
const force = argv.includes("--force");

if (!seedId) fail("usage: --seed-id <id> [--out-dir .tgf/issues] [--write] [--force]");
if (!isValidSeedId(seedId)) fail(`invalid --seed-id: ${seedId}`);

function assertIssueOutDir(rawOutDir) {
  const issueRoot = path.resolve(process.cwd(), ".tgf", "issues");
  const resolved = path.resolve(process.cwd(), rawOutDir);
  if (resolved !== issueRoot) {
    fail(`--out-dir must be .tgf/issues, got ${rawOutDir}`);
  }
  let current = process.cwd();
  for (const segment of path.relative(process.cwd(), resolved).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      fail(`--out-dir cannot traverse symlink: ${path.relative(process.cwd(), current)}`);
    }
  }
  return resolved;
}
const issueOutDir = assertIssueOutDir(outDir);

function issueFileFor(id) {
  const file = path.join(issueOutDir, `${id}.md`);
  const rel = path.relative(issueOutDir, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    fail(`issue file escaped output dir: ${id}`);
  }
  return file;
}

const runDir = runDirFor(process.cwd(), seedId);
let manifest;
try { manifest = readManifest(runDir, seedId, process.cwd()); }
catch (e) { fail(`manifest rejected: ${e.message}`); }
if (!manifest) fail(`no run at .tgf/seeds/${seedId}`);
if (!manifest.game_thesis_path) fail("refusing to emit issues before GAME_THESIS.md exists");
if (!manifest.engine_decision_path) fail("refusing to emit issues before an engine decision exists");

let thesisPath;
let enginePath;
try {
  thesisPath = resolveRunPath(process.cwd(), seedId, manifest.game_thesis_path, "game_thesis_path");
  enginePath = resolveRunPath(process.cwd(), seedId, manifest.engine_decision_path, "engine_decision_path");
} catch (e) {
  fail(e.message);
}
for (const [kind, file, schema] of [["thesis", thesisPath, "game-thesis"], ["engine", enginePath, "engine-profile-decision"]]) {
  const errors = validateEmbeddedJson(file, schema);
  if (errors.length) fail(`${kind} artifact invalid:\n  ${errors.join("\n  ")}`);
}

const thesis = extractFencedJson(fs.readFileSync(thesisPath, "utf8")).obj;
const engine = extractFencedJson(fs.readFileSync(enginePath, "utf8")).obj;
if (engine.status !== "accepted") {
  fail(`engine decision must be accepted before emitting issues, got ${engine.status}`);
}
if (engine.seed_id !== seedId) {
  fail(`engine decision seed_id '${engine.seed_id}' does not match --seed-id '${seedId}'`);
}
const slice = thesis.first_playable_slice || {};
const sliceScope = typeof slice.scope === "string" ? slice.scope : "first playable slice from GAME_THESIS.md";
const botCriteria = Array.isArray(thesis.bot_success_criteria) ? thesis.bot_success_criteria : [];

// The local issue tracker uses a deliberately tiny YAML-front-matter subset.
// Keep generated scalars one physical line so schema-valid thesis prose cannot
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

function issueMarkdown({ id, title, type, state, afk, acceptance, evidence = [], body }) {
  return `---\nid: ${id}\ntitle: ${quoted(title)}\ntype: ${type}\nstate: ${state}\nafk: ${afk}\nacceptance:\n${yamlList(acceptance)}\nevidence:\n${yamlList(evidence)}\n---\n\n${body.trim()}\n`;
}

const ISSUE_TEMPLATES = [
  {
    suffix: "first-slice",
    build: ({ seedId, sliceScope, botCriteria, manifest, engine }) => ({
      title: `${seedId}: build first playable slice`,
      type: "slice",
      state: "ready-for-agent",
      afk: "ready-for-agent",
      acceptance: [
        `Build only this first-slice scope: ${sliceScope}`,
        ...botCriteria,
        `Emit a playtest report under .tgf/seeds/${seedId}/playtests/`,
        `node scripts/validate-artifacts.mjs --check run --seed-id ${seedId} passes`
      ],
      evidence: [manifest.game_thesis_path, manifest.engine_decision_path],
      body: `Source thesis: ${manifest.game_thesis_path}\nEngine decision: ${manifest.engine_decision_path}\nChosen profile: ${engine.profile || engine.decision || "see engine ADR"}\n\nKeep this to first-slice proof. No content, high-fidelity art, accounts, backend, or polish.`
    })
  },
  {
    suffix: "depth-review",
    build: ({ seedId }) => ({
      title: `${seedId}: run anti-boring depth review`,
      type: "chore",
      state: "needs-info",
      afk: "needs-human",
      acceptance: [
        `A playtest report exists for ${seedId}`,
        "A depth-vector.json scores all twelve axes",
        "ANTI_BORING_VERDICT.md emits ADVANCE, DEEPEN with one transform, or KILL"
      ],
      body: "Blocked until the first playable slice produces bot playtest evidence. Once evidence exists, this can move to ready-for-agent."
    })
  }
];
const issueContext = { seedId, sliceScope, botCriteria, manifest, engine };
const issues = ISSUE_TEMPLATES.map((template) => {
  const id = `${seedId}-${template.suffix}`;
  return { id, md: issueMarkdown({ id, ...template.build(issueContext) }) };
});

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

if (!write) {
  console.log(`# Dry-run local issues for ${seedId}`);
  console.log(`# Re-run with --write to create files under ${path.relative(process.cwd(), issueOutDir) || "."}.`);
  for (const issue of issues) {
    console.log(`\n--- ${path.join(path.relative(process.cwd(), issueOutDir), `${issue.id}.md`)} ---`);
    console.log(issue.md.trimEnd());
  }
  process.exit(0);
}

fs.mkdirSync(issueOutDir, { recursive: true });
const writes = issues.map((issue) => ({ issue, file: issueFileFor(issue.id) }));
for (const { file } of writes) {
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) {
    fail(`issue file cannot be a symlink: ${path.relative(process.cwd(), file)}`);
  }
  if (fs.existsSync(file) && !force) fail(`${file} exists; pass --force to overwrite`);
}

function writeIssueFile(file, contents) {
  const flags =
    fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    (force ? fs.constants.O_TRUNC : fs.constants.O_EXCL) |
    (fs.constants.O_NOFOLLOW || 0);
  let fd;
  try {
    fd = fs.openSync(file, flags, 0o666);
    fs.writeFileSync(fd, contents);
  } catch (e) {
    if (e.code === "EEXIST") fail(`${file} exists; pass --force to overwrite`);
    if (e.code === "ELOOP") fail(`issue file cannot be a symlink: ${path.relative(process.cwd(), file)}`);
    throw e;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

for (const { issue, file } of writes) {
  writeIssueFile(file, issue.md);
  console.log(`[emit-local-issues] wrote ${path.relative(process.cwd(), file)}`);
}
