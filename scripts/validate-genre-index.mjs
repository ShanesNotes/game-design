#!/usr/bin/env node
// Validate Tier-2 reference-canon rows and refresh the greppable summary.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { arg } from "./lib/argv.mjs";
import { validate } from "./lib/validate-json-schema.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DESIGN_FACETS = [
  "register", "loop_class", "session_structure", "progression_form", "player_count"
];

const CLASS_DEFINITIONS = {
  "review-niche": "taxonomy-v1#steam-user-reviews/review-niche",
  "review-established": "taxonomy-v1#steam-user-reviews/review-established",
  "review-breakout": "taxonomy-v1#steam-user-reviews/review-breakout",
  "storefront-listed": "taxonomy-v1#storefront-genres/storefront-listed",
  "team-solo": "taxonomy-v1#development-team-size/team-solo",
  "team-micro": "taxonomy-v1#development-team-size/team-micro",
  "team-small": "taxonomy-v1#development-team-size/team-small",
  "team-large": "taxonomy-v1#development-team-size/team-large",
  "time-short": "taxonomy-v1#development-time-months/time-short",
  "time-medium": "taxonomy-v1#development-time-months/time-medium",
  "time-long": "taxonomy-v1#development-time-months/time-long"
};

function readJson(file, errors, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${label}: JSON parse failed: ${error.message}`);
    return null;
  }
}

function dateIsValid(value, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value && value <= today;
}

function expectedReviewClass(value) {
  if (!Number.isInteger(value) || value < 0) return null;
  if (value < 10000) return "review-niche";
  if (value < 100000) return "review-established";
  return "review-breakout";
}

function rangeBounds(value) {
  if (Number.isInteger(value) && value >= 0) return [value, value];
  if (typeof value !== "string") return null;
  let match = value.match(/^(\d+)$/);
  if (match) return [Number(match[1]), Number(match[1])];
  match = value.match(/^(\d+)-(\d+)$/);
  if (match && Number(match[1]) <= Number(match[2])) return [Number(match[1]), Number(match[2])];
  match = value.match(/^(\d+)\+$/);
  if (match) return [Number(match[1]), Infinity];
  return null;
}

function expectedProductionClass(metric, value) {
  const bounds = rangeBounds(value);
  if (!bounds) return null;
  if (metric === "development_team_size" && bounds[0] < 1) return null;
  const classify = metric === "development_team_size"
    ? (n) => n === 1 ? "team-solo" : n <= 5 ? "team-micro" : n <= 20 ? "team-small" : "team-large"
    : metric === "development_time_months"
      ? (n) => n <= 12 ? "time-short" : n <= 36 ? "time-medium" : "time-long"
      : null;
  if (!classify) return null;
  const low = classify(bounds[0]);
  const high = classify(bounds[1]);
  return low === high ? low : null;
}

function evidenceErrors(item, label, today, production = false) {
  const errors = [];
  let expected = null;
  if (production) {
    expected = expectedProductionClass(item.metric_type, item.value_or_range);
    if (!expected) errors.push(`${label}: value_or_range cannot be classified inside one frozen threshold`);
  } else if (item.metric_type === "steam_user_reviews") {
    expected = expectedReviewClass(item.value_or_range);
    if (!expected) errors.push(`${label}: steam_user_reviews value_or_range must be a non-negative integer`);
  } else if (item.metric_type === "storefront_genres") {
    expected = "storefront-listed";
    if (!Array.isArray(item.value_or_range) || item.value_or_range.length === 0 ||
        item.value_or_range.some((value) => typeof value !== "string" || !value.trim())) {
      errors.push(`${label}: storefront_genres must preserve a non-empty string array`);
    }
  }
  if (expected && item.class !== expected) {
    errors.push(`${label}: expected class '${expected}' for ${item.metric_type}, got '${item.class}'`);
  }
  if (expected && item.class_definition !== CLASS_DEFINITIONS[expected]) {
    errors.push(`${label}: expected class_definition '${CLASS_DEFINITIONS[expected]}'`);
  }
  if (!dateIsValid(item.observed_at, today)) {
    errors.push(`${label}: observed_at must be a real, non-future YYYY-MM-DD date`);
  }
  try {
    const source = new URL(item.source);
    if (source.protocol !== "https:") throw new Error("not HTTPS");
  } catch {
    errors.push(`${label}: source must be a valid HTTPS URL`);
  }
  return errors;
}

function membershipErrors(membership, label) {
  const errors = [];
  if (membership.secondary.includes(membership.primary)) {
    errors.push(`${label}: primary '${membership.primary}' must not repeat in secondary`);
  }
  if (new Set(membership.secondary).size !== membership.secondary.length) {
    errors.push(`${label}: duplicate secondary membership`);
  }
  return errors;
}

function summaryFor(row) {
  const summary = { id: row.id, title: row.title };
  for (const facet of DESIGN_FACETS) {
    summary[facet] = [row.design_shape[facet].primary, ...[...row.design_shape[facet].secondary].sort()];
  }
  summary.market_genres = [row.market_genres.primary, ...[...row.market_genres.secondary].sort()];
  if (row.card_ref) summary.card_ref = row.card_ref;
  return summary;
}

/** Validate source rows; write the generated summary only when every check passes. */
export function validateGenreIndex({
  rowsDir,
  indexPath = null,
  schemaPath,
  cardsDir,
  today = new Date().toISOString().slice(0, 10)
}) {
  const errors = [];
  if (!fs.existsSync(schemaPath)) return { errors: [`missing schema: ${schemaPath}`], rows: [], indexLines: [] };
  if (!fs.existsSync(rowsDir)) return { errors: [`missing rows dir: ${rowsDir}`], rows: [], indexLines: [] };
  if (!fs.existsSync(cardsDir)) return { errors: [`missing cards dir: ${cardsDir}`], rows: [], indexLines: [] };
  if (!fs.lstatSync(rowsDir).isDirectory() || fs.lstatSync(rowsDir).isSymbolicLink()) {
    return { errors: [`rows dir must be a real directory: ${rowsDir}`], rows: [], indexLines: [] };
  }

  const schema = readJson(schemaPath, errors, "schema");
  if (!schema) return { errors, rows: [], indexLines: [] };
  const files = fs.readdirSync(rowsDir).filter((name) => name.endsWith(".json")).sort();
  const rows = [];
  const seenIds = new Set();
  const seenTitles = new Set();

  for (const file of files) {
    const full = path.join(rowsDir, file);
    if (!fs.lstatSync(full).isFile() || fs.lstatSync(full).isSymbolicLink()) {
      errors.push(`${file}: row must be a real file`);
      continue;
    }
    const row = readJson(full, errors, file);
    if (!row) continue;
    const schemaErrors = validate(schema, row);
    for (const error of schemaErrors) errors.push(`${file}: ${error}`);
    if (schemaErrors.length) continue;

    if (file !== `${row.id}.json`) errors.push(`${file}: filename must be '${row.id}.json'`);
    if (seenIds.has(row.id)) errors.push(`${file}: duplicate id '${row.id}'`);
    seenIds.add(row.id);
    const normalizedTitle = row.title.trim().toLowerCase();
    if (seenTitles.has(normalizedTitle)) errors.push(`${file}: duplicate normalized title '${row.title.trim()}'`);
    seenTitles.add(normalizedTitle);

    if (row.moat.length > 120) errors.push(`${file}: moat must be at most 120 characters`);
    for (const facet of DESIGN_FACETS) {
      errors.push(...membershipErrors(row.design_shape[facet], `${file}: ${facet}`));
    }
    errors.push(...membershipErrors(row.market_genres, `${file}: market_genres`));

    row.evidence.forEach((item, index) => {
      errors.push(...evidenceErrors(item, `${file}: evidence[${index}]`, today));
    });
    if (!row.evidence.some((item) => item.metric_type === "steam_user_reviews")) {
      errors.push(`${file}: evidence must include steam_user_reviews reach evidence`);
    }
    if (!row.evidence.some((item) => item.metric_type === "storefront_genres")) {
      errors.push(`${file}: evidence must include storefront_genres evidence`);
    }
    const fetchedMarketGenres = new Set(
      row.evidence
        .filter((item) => item.metric_type === "storefront_genres")
        .flatMap((item) => item.value_or_range)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    );
    for (const genre of new Set([row.market_genres.primary, ...row.market_genres.secondary])) {
      if (!fetchedMarketGenres.has(genre)) {
        errors.push(`${file}: market genre '${genre}' is absent from fetched storefront_genres evidence`);
      }
    }
    (row.production_scale_evidence || []).forEach((item, index) => {
      errors.push(...evidenceErrors(item, `${file}: production_scale_evidence[${index}]`, today, true));
    });

    const matchingCard = path.join(cardsDir, `${row.id}.json`);
    if (fs.existsSync(matchingCard) && row.card_ref !== row.id) {
      errors.push(`${file}: existing Tier-1 card requires card_ref '${row.id}'`);
    }
    if (row.card_ref) {
      if (row.card_ref !== row.id) {
        errors.push(`${file}: card_ref must equal row id '${row.id}'`);
      }
      const cardPath = path.join(cardsDir, `${row.card_ref}.json`);
      if (!fs.existsSync(cardPath)) {
        errors.push(`${file}: card_ref '${row.card_ref}' does not resolve`);
      } else {
        const card = readJson(cardPath, errors, `${file}: card_ref`);
        if (card && card.id !== row.card_ref) errors.push(`${file}: card_ref body id does not match '${row.card_ref}'`);
      }
    }
    rows.push(row);
  }

  rows.sort((a, b) => a.id.localeCompare(b.id));
  const indexLines = rows.map((row) => JSON.stringify(summaryFor(row)));
  if (errors.length === 0 && indexPath) {
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    const body = indexLines.length ? `${indexLines.join("\n")}\n` : "";
    const tempPath = `${indexPath}.tmp-${process.pid}`;
    fs.writeFileSync(tempPath, body);
    fs.renameSync(tempPath, indexPath);
  }
  return { errors, rows, indexLines };
}

function main() {
  const rowsDir = path.resolve(arg("rows-dir") || path.join(REPO, "docs/reference-games/genre-index"));
  const indexPath = path.resolve(arg("index") || path.join(REPO, "docs/reference-games/genre-index.jsonl"));
  const schemaPath = path.resolve(arg("schema") || path.join(REPO, "schemas/genre-index-row.schema.json"));
  const cardsDir = path.resolve(arg("cards-dir") || path.join(REPO, "docs/reference-games/cards"));
  const result = validateGenreIndex({ rowsDir, indexPath, schemaPath, cardsDir });
  if (result.errors.length) {
    for (const error of result.errors) console.error(`  ${error}`);
    console.error(`[genre-index] ERROR: ${result.errors.length} error(s); summary not written`);
    process.exit(1);
  }
  console.log(`[genre-index] OK: ${result.rows.length} row(s); wrote ${path.relative(REPO, indexPath)}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
