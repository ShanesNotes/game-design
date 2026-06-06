#!/usr/bin/env node
// Blocks gameplay completion claims without at least one playtest report.
import { playtestReports, block, allow } from "./lib/guard.mjs";

if (!playtestReports().length) block("no playtests/**/playtest_report.json found.");
allow();
