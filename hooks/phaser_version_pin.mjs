#!/usr/bin/env node
// Checks package.json for Phaser 4+ pin if Phaser is used.
import fs from "node:fs";
if (!fs.existsSync("package.json")) process.exit(0);
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const ver = (pkg.dependencies && pkg.dependencies.phaser) || (pkg.devDependencies && pkg.devDependencies.phaser);
if (!ver) process.exit(0);
if (!/^(\^|~)?4\./.test(ver)) {
  console.error(`[TGF phaser_version_pin] BLOCK: Phaser dependency must be v4+ for this profile. Found ${ver}`);
  process.exit(2);
}
process.exit(0);
