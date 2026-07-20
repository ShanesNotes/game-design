#!/usr/bin/env node
// P17 toolchain probe. Verifies tool availability via real commands — never from memory.
// Writes .factory/local_tool_probe.json and refreshes the generated block inside the
// curated toolchain ledger (default docs/toolchain-verification-ledger.md; override with
// `--write <ledger.md>`) without clobbering hand-written rows.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Self-describing probe definitions: each carries its category so the generated
// ledger renders grouped (base toolchain / builders / engines / harness) and a
// reader can see at a glance which lane a missing tool belongs to.
const checks = [
  { cmd: "node", args: ["--version"], category: "base" },
  { cmd: "npm", args: ["--version"], category: "base" },
  { cmd: "pnpm", args: ["--version"], category: "base" },
  { cmd: "git", args: ["--version"], category: "base" },
  { cmd: "claude", args: ["--version"], category: "builder" },
  { cmd: "codex", args: ["--version"], category: "builder" },
  { cmd: "omx", args: ["--version"], category: "builder" },
  { cmd: "kimi", args: ["--version"], category: "builder" },
  { cmd: "npx", args: ["playwright", "--version"], category: "harness" },
  { cmd: "godot", args: ["--version"], category: "engine" },
  { cmd: "godot4", args: ["--version"], category: "engine" },
  { cmd: "cargo", args: ["--version"], category: "engine" }
];

const results = [];
for (const { cmd, args, category } of checks) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32" });
  results.push({
    category,
    command: [cmd, ...args].join(" "),
    ok: r.status === 0,
    stdout: (r.stdout || "").trim().slice(0, 300),
    stderr: (r.stderr || "").trim().slice(0, 300)
  });
}

const iso = new Date().toISOString();
console.log(JSON.stringify({ date: iso, results }, null, 2));
fs.mkdirSync(".factory", { recursive: true });
fs.writeFileSync(".factory/local_tool_probe.json", JSON.stringify({ date: iso, results }, null, 2));

const writeIdx = process.argv.indexOf("--write");
if (writeIdx >= 0 && !process.argv[writeIdx + 1]) {
  console.error("[verify-local-tools] ERROR: --write requires a <ledger.md> path");
  process.exit(1);
}
const ledgerPath = writeIdx >= 0
  ? process.argv[writeIdx + 1]
  : path.join("docs", "toolchain-verification-ledger.md");
{
  const START = "<!-- TGF:PROBE:START -->";
  const END = "<!-- TGF:PROBE:END -->";
  let block = `${START}\n\n## Local probe results (generated)\n\n`;
  block += `_Probed ${iso} by \`scripts/verify-local-tools.mjs\`; generated — do not hand-edit._\n\n`;
  block += "| Category | Probe | Available | First line |\n|---|---|---|---|\n";
  for (const r of results) {
    const note = (r.stdout || r.stderr || "").split("\n")[0].slice(0, 60).replace(/\|/g, "/");
    block += `| ${r.category} | \`${r.command}\` | ${r.ok ? "yes" : "no (PROBE)"} | ${note} |\n`;
  }
  block += `\n${END}\n`;

  let md = fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, "utf8") : "";
  if (md.includes(START) && md.includes(END)) {
    md = md.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block.trim());
  } else {
    md = `${md.trimEnd()}\n\n${block}`;
  }
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.writeFileSync(ledgerPath, md);
  console.error(`[verify-local-tools] refreshed generated probe block in ${ledgerPath}`);
}
