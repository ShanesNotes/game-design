#!/usr/bin/env node
// Requires long-run bot/falsifier evidence for overnight/AFK runs.
// A run is treated as AFK/nightly when `--afk` is passed or GUARD_AFK=1 is set.
// Blocks if no playtests/**/playtest_report.json records a >=300s session.
import { playtestReports, readJsonSafe, hasFlag, block, allow } from "./lib/guard.mjs";

const afk = hasFlag("--afk") || process.env.GUARD_AFK === "1";
if (!afk) allow();

const longEnough = playtestReports().some((p) => {
  const r = readJsonSafe(p);
  return r && Number(r.duration_seconds) >= 300;
});

if (!longEnough) block("AFK/nightly run needs a >=300s bot + falsifier playtest report.");
allow();
