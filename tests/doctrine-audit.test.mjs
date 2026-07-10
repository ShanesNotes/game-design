import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditErrors,
  parseAuditLedger,
  AUDIT_UNIVERSE_PATHS
} from "../scripts/lib/doctrine-audit.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (...p) => path.join(REPO, ...p);

function node(script, args, opts = {}) {
  return spawnSync(process.execPath, [rel("scripts", script), ...args], {
    encoding: "utf8",
    cwd: REPO,
    ...opts
  });
}

test("parseAuditLedger reads path · disposition · rationale rows", () => {
  const text = `
# Ledger
| path | disposition | rationale |
| --- | --- | --- |
| \`docs/doctrine.md\` | rewritten | studio re-derive |
| \`hooks/scope_brake.mjs\` | reaffirmed | still binds |
| \`docs/old.md\` | culled | quarantine |
`;
  const { rows, duplicates } = parseAuditLedger(text);
  assert.equal(duplicates.length, 0);
  assert.equal(rows.size, 3);
  assert.equal(rows.get("docs/doctrine.md").disposition, "rewritten");
  assert.match(rows.get("docs/doctrine.md").rationale, /studio re-derive/);
  assert.equal(rows.get("docs/old.md").disposition, "culled");
});

test("auditErrors fails when a tracked universe file lacks a ledger row", () => {
  const ledger = `
| \`docs/a.md\` | reaffirmed | ok |
`;
  const parsed = parseAuditLedger(ledger);
  const errors = auditErrors(["docs/a.md", "docs/b.md"], parsed);
  assert.ok(errors.some((e) => e.includes("universe file missing from audit ledger: docs/b.md")), errors.join("\n"));
});

test("auditErrors fails when a culled path is still tracked", () => {
  const ledger = `
| \`docs/gone.md\` | culled | removed |
`;
  const parsed = parseAuditLedger(ledger);
  const errors = auditErrors(["docs/gone.md"], parsed);
  assert.ok(errors.some((e) => e.includes("culled but still tracked: docs/gone.md")), errors.join("\n"));
});

test("auditErrors passes when every universe file has a row", () => {
  const ledger = `
| \`docs/a.md\` | reaffirmed | ok |
| \`docs/b.md\` | rewritten | ok |
| \`docs/c.md\` | culled | gone |
`;
  const parsed = parseAuditLedger(ledger);
  const errors = auditErrors(["docs/a.md", "docs/b.md"], parsed);
  assert.deepEqual(errors, []);
});

test("validate-artifacts --check audit passes on the real ledger", () => {
  const r = node("validate-artifacts.mjs", ["--check", "audit"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /✓ audit/);
});

test("real doctrine-audit-ledger covers the regenerated git universe", () => {
  const text = fs.readFileSync(rel("docs/doctrine-audit-ledger.md"), "utf8");
  const { rows } = parseAuditLedger(text);
  assert.ok(rows.size >= 83, `expected >=83 rows, got ${rows.size}`);
  const ls = spawnSync("git", ["ls-files", ...AUDIT_UNIVERSE_PATHS], {
    cwd: REPO,
    encoding: "utf8"
  });
  assert.equal(ls.status, 0, ls.stderr);
  const files = ls.stdout.split("\n").map((s) => s.trim()).filter(Boolean);
  const errors = auditErrors(files, { rows, duplicates: [] });
  assert.deepEqual(errors, [], errors.join("\n"));
});
