#!/usr/bin/env node
// Code-native over opaque: an MCP/editor mutation must leave at least one diffable
// text artifact. Pass the paths a mutation produced as args. Blocks when the
// mutation emitted opaque output(s) and NOTHING diffable to review — the exact
// "wrote-it-but-can't-see-it" failure the doctrine rejects. A mutation that also
// emits a recipe/provenance/scene-text file passes.
import { changedPaths, OPAQUE_ASSET_RE, block, allow } from "./lib/guard.mjs";

const DIFFABLE_RE = /\.(md|json|jsonl|txt|ts|tsx|js|mjs|cjs|yaml|yml|toml|tscn|tres|csv|svg)$/i;
const paths = changedPaths();
const opaque = paths.filter((p) => OPAQUE_ASSET_RE.test(p));
const diffable = paths.filter((p) => DIFFABLE_RE.test(p));

if (opaque.length && !diffable.length) {
  block(`MCP/editor mutation emitted opaque output with no diffable artifact: ${opaque.join(", ")}`);
}
allow();
