#!/usr/bin/env node
// Validate docs/reference-games/cards/*.json against reference-card schema,
// require each card id to appear in CANON.md, and refresh index.jsonl.
// Usage: node scripts/validate-reference-cards.mjs
//        [--cards-dir <path>] [--canon <path>] [--index <path>] [--schema <path>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { arg } from "./lib/argv.mjs";
import { validateJsonCorpus } from "./lib/validate-json-corpus.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message, code = 1) {
  console.error(`[reference-cards] ERROR: ${message}`);
  process.exit(code);
}

/** @returns {{ errors: string[], indexLines: string[] }} */
export function validateReferenceCards({
  cardsDir,
  canonPath,
  indexPath,
  schemaPath
}) {
  if (!fs.existsSync(canonPath)) {
    return { errors: [`missing CANON: ${canonPath}`], indexLines: [] };
  }
  if (!fs.existsSync(cardsDir)) {
    return { errors: [`missing cards dir: ${cardsDir}`], indexLines: [] };
  }

  const canonText = fs.readFileSync(canonPath, "utf8");
  const canonIdCounts = parseCanonIdColumnCounts(canonText);

  const { errors, indexLines } = validateJsonCorpus({
    dir: cardsDir,
    schemaPath,
    indexPath,
    duplicateIdLabel: "card id",
    // README contract: cards/<id>.json. Only the documented fixture is exempt.
    filenameOk: (file, id) => file === "_example.json" || file === `${id}.json`,
    summaryFrom: (card) => ({
      id: card.id,
      title: card.title,
      genre_tags: card.genre_tags,
      register_mapping: card.register_mapping,
      status: card.status
    }),
    extraErrors(card, file) {
      const rowCount = canonIdCounts.get(card.id) || 0;
      if (rowCount !== 1) {
        return [
          rowCount === 0
            ? `${file}: card id '${card.id}' not listed in CANON.md`
            : `${file}: card id '${card.id}' appears ${rowCount} times in CANON.md table (need exactly one)`
        ];
      }
      return [];
    }
  });

  return { errors, indexLines };
}

/**
 * Count data-row first-column values in a Markdown table in CANON.md.
 * Skips header rows (first cell "id") and separator rows (|---|).
 * @returns {Map<string, number>}
 */
export function parseCanonIdColumnCounts(canonText) {
  const counts = new Map();
  for (const raw of canonText.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    // Separator: |---|-------| or | --- | --- |
    if (/^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (!cells.length) continue;
    const id = cells[0];
    if (!id || id.toLowerCase() === "id") continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

function main() {
  const cardsDir = path.resolve(arg("cards-dir") || path.join(REPO, "docs/reference-games/cards"));
  const canonPath = path.resolve(arg("canon") || path.join(REPO, "docs/reference-games/CANON.md"));
  const indexPath = path.resolve(arg("index") || path.join(REPO, "docs/reference-games/index.jsonl"));
  const schemaPath = path.resolve(arg("schema") || path.join(REPO, "schemas/reference-card.schema.json"));

  const { errors, indexLines } = validateReferenceCards({
    cardsDir, canonPath, indexPath, schemaPath
  });

  if (errors.length) {
    for (const e of errors) console.error(`  ${e}`);
    fail(`${errors.length} error(s); index not written`);
  }

  console.log(`[reference-cards] OK: ${indexLines.length} card(s); wrote ${path.relative(REPO, indexPath) || indexPath}`);
}

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
