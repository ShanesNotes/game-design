#!/usr/bin/env node
// Checks package.json for Phaser 4+ pin if Phaser is used.
import fs from "node:fs";
import { block, allow } from "./lib/guard.mjs";

if (!fs.existsSync("package.json")) allow();
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const ver = (pkg.dependencies && pkg.dependencies.phaser) || (pkg.devDependencies && pkg.devDependencies.phaser);
if (!ver) allow();
if (!/^(\^|~)?4\./.test(ver)) block(`Phaser dependency must be v4+ for this profile. Found ${ver}`);
allow();
