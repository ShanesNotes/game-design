#!/usr/bin/env node
// Starter guard: blocks obvious scope drift if a gameplay edit occurs before GAME_THESIS.md.
// Real Claude/Codex/Grok hook adapters should pass changed paths via stdin/env.
import fs from "node:fs";
import { argsString, block, allow } from "./lib/guard.mjs";

const thesisExists = fs.existsSync("GAME_THESIS.md");
const touchesSrc = /(^|\s)(src|assets|packs|server|app)\//.test(argsString());

if (!thesisExists && touchesSrc) block("implementation before GAME_THESIS.md.");
allow();
