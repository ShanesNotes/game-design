#!/usr/bin/env node
// Doctrine non-negotiable: no content expansion before fun-lock. Blocks edits to
// content/level/narrative authoring paths unless .factory/FUN_LOCK exists.
// (scope_brake guards src/ pre-thesis; this guards content/ pre-fun-lock.)
import fs from "node:fs";
import { changedPaths, block, allow } from "./lib/guard.mjs";

const CONTENT_RE = /(^|\/)(content|narrative|levels|maps|story|quests)\//;
const touchesContent = changedPaths().some((p) => CONTENT_RE.test(p));
const funLock = fs.existsSync(".factory/FUN_LOCK");

if (touchesContent && !funLock) block("content/level authoring before .factory/FUN_LOCK (fun-lock gate).");
allow();
