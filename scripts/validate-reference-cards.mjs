#!/usr/bin/env node
// Validate docs/reference-games/cards/*.json against reference-card schema,
// require each card id to appear in CANON.md, and refresh index.jsonl.
// Usage: node scripts/validate-reference-cards.mjs
//        [--cards-dir <path>] [--canon <path>] [--index <path>] [--schema <path>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { arg } from "./lib/argv.mjs";
import { validate } from "./lib/validate-json-schema.mjs";

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
  const errors = [];
  if (!fs.existsSync(schemaPath)) {
    return { errors: [`missing schema: ${schemaPath}`], indexLines: [] };
  }
  if (!fs.existsSync(canonPath)) {
    return { errors: [`missing CANON: ${canonPath}`], indexLines: [] };
  }
  if (!fs.existsSync(cardsDir)) {
    return { errors: [`missing cards dir: ${cardsDir}`], indexLines: [] };
  }

  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (e) {
    return { errors: [`schema parse failed: ${e.message}`], indexLines: [] };
  }

  const canonText = fs.readFileSync(canonPath, "utf8");
  const canonIdCounts = parseCanonIdColumnCounts(canonText);
  const files = fs.readdirSync(cardsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const summaries = [];
  const seenIds = new Set();

  for (const file of files) {
    const full = path.join(cardsDir, file);
    let card;
    try {
      card = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (e) {
      errors.push(`${file}: JSON parse failed: ${e.message}`);
      continue;
    }

    const schemaErrs = validate(schema, card);
    for (const e of schemaErrs) errors.push(`${file}: ${e}`);
    if (schemaErrs.length) continue;

    // README contract: cards/<id>.json. Underscore-prefixed files are fixtures
    // (e.g. _example.json) and may keep a synthetic name.
    const isFixture = file.startsWith("_");
    if (!isFixture && file !== `${card.id}.json`) {
      errors.push(
        `${file}: filename must be '${card.id}.json' (got '${file}')`
      );
    }

    if (seenIds.has(card.id)) {
      errors.push(`${file}: duplicate card id '${card.id}'`);
    }
    seenIds.add(card.id);

    // Canon membership: exactly one data row whose first column equals card.id.
    // Header cells, prose, and HTML comments do not count.
    const rowCount = canonIdCounts.get(card.id) || 0;
    if (rowCount !== 1) {
      errors.push(
        rowCount === 0
          ? `${file}: card id '${card.id}' not listed in CANON.md`
          : `${file}: card id '${card.id}' appears ${rowCount} times in CANON.md table (need exactly one)`
      );
    }

    summaries.push({
      id: card.id,
      title: card.title,
      genre_tags: card.genre_tags,
      register_mapping: card.register_mapping,
      status: card.status
    });
  }

  summaries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const indexLines = summaries.map((row) => JSON.stringify(row));

  if (errors.length === 0 && indexPath) {
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    const body = indexLines.length ? indexLines.join("\n") + "\n" : "";
    fs.writeFileSync(indexPath, body);
  }

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
