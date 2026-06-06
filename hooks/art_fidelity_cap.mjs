#!/usr/bin/env node
// Blocks opaque/high-fidelity assets before gates.
// Override only by writing .factory/FUN_LOCK and .factory/ART_DIRECTION_LOCK.
import fs from "node:fs";
import { argsString, OPAQUE_ASSET_RE, block, allow } from "./lib/guard.mjs";

const opaque = OPAQUE_ASSET_RE.test(argsString());
const fun = fs.existsSync(".factory/FUN_LOCK");
const art = fs.existsSync(".factory/ART_DIRECTION_LOCK");

if (opaque && !(fun && art)) block("opaque asset before G1 fun-lock and G2 art-direction.");
allow();
