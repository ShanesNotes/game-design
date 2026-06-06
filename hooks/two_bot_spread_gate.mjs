#!/usr/bin/env node
// Anti-boring Two-Bot test: a random bot and a heuristic/skilled bot must produce
// materially different outcomes. Blocks unless playtests cover >=2 distinct
// bot_type values. Mirrors factory.config.toml [gates] minimum_two_bot_spread_required.
import { playtestReports, readJsonSafe, block, allow } from "./lib/guard.mjs";

const types = new Set();
for (const p of playtestReports()) {
  const r = readJsonSafe(p);
  if (r && r.bot_type) types.add(r.bot_type);
}

if (types.size < 2) block("anti-boring Two-Bot test needs >=2 distinct bot_type playtests.");
allow();
