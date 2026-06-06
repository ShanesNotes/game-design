#!/usr/bin/env node
// Blocks obvious engine package migration without a decision file mention.
import fs from "node:fs";
import { argsString, block, allow } from "./lib/guard.mjs";

const enginePkg = /(package\.json|pnpm-lock|package-lock|Cargo\.toml|project\.godot|vite\.config)/.test(argsString());
if (!enginePkg) allow();

const decisions = fs.existsSync("decisions")
  ? fs.readdirSync("decisions").filter((f) => /engine|migration|profile/i.test(f))
  : [];
if (!decisions.length) block("engine/tooling change requires decisions/NNNN-engine-*.md.");
allow();
