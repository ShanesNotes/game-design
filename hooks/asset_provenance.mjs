#!/usr/bin/env node
// Blocks opaque assets unless a nearby .provenance.md/json exists.
// Pass asset paths as args.
import fs from "node:fs";
import path from "node:path";
import { changedPaths, OPAQUE_ASSET_RE, block, allow } from "./lib/guard.mjs";

const bad = [];
for (const p of changedPaths()) {
  if (!OPAQUE_ASSET_RE.test(p)) continue;
  const dir = path.dirname(p);
  const base = path.basename(p).replace(/\.[^.]+$/, "");
  const candidates = [
    path.join(dir, `${base}.provenance.md`),
    path.join(dir, `${base}.provenance.json`),
    path.join(dir, "ASSET_PROVENANCE.md")
  ];
  if (!candidates.some(fs.existsSync)) bad.push(p);
}
if (bad.length) block(`opaque asset(s) without provenance: ${bad.join(", ")}`);
allow();
