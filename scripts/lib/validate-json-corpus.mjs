// Shared JSON-corpus skeleton for reference-canon validators: load schema, scan
// dir for *.json, parse, schema-validate, enforce filename === {id}.json, reject
// duplicate ids, collect domain extraErrors, optionally write a greppable *.jsonl
// index atomically (temp + rename). Adapters supply only domain policy.
import fs from "node:fs";
import path from "node:path";
import { validate } from "./validate-json-schema.mjs";

function atomicWrite(filePath, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tempPath, body);
  fs.renameSync(tempPath, filePath);
}

/**
 * @param {object} opts
 * @param {string} opts.dir — directory of *.json rows/cards
 * @param {string} opts.schemaPath
 * @param {string|null} [opts.indexPath] — write jsonl only when errors is empty
 * @param {(obj: object) => string} [opts.idFrom]
 * @param {(obj: object) => object} [opts.summaryFrom] — if set, builds indexLines
 * @param {(obj: object, file: string, ctx: { dir: string, full: string }) => string[]} [opts.extraErrors]
 * @param {(file: string, id: string) => boolean} [opts.filenameOk]
 * @param {string} [opts.duplicateIdLabel] — "id" | "card id"
 * @param {boolean} [opts.requireRealFiles] — reject symlinks (genre-index)
 * @returns {{ errors: string[], rows: object[], indexLines: string[] }}
 */
export function validateJsonCorpus({
  dir,
  schemaPath,
  indexPath = null,
  idFrom = (obj) => obj.id,
  summaryFrom = null,
  extraErrors = null,
  filenameOk = (file, id) => file === `${id}.json`,
  duplicateIdLabel = "id",
  requireRealFiles = false
}) {
  const errors = [];
  if (!fs.existsSync(schemaPath)) {
    return { errors: [`missing schema: ${schemaPath}`], rows: [], indexLines: [] };
  }
  if (!fs.existsSync(dir)) {
    return { errors: [`missing dir: ${dir}`], rows: [], indexLines: [] };
  }
  if (requireRealFiles) {
    const st = fs.lstatSync(dir);
    if (!st.isDirectory() || st.isSymbolicLink()) {
      return { errors: [`dir must be a real directory: ${dir}`], rows: [], indexLines: [] };
    }
  }

  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (error) {
    return { errors: [`schema parse failed: ${error.message}`], rows: [], indexLines: [] };
  }

  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  const rows = [];
  const seenIds = new Set();

  for (const file of files) {
    const full = path.join(dir, file);
    if (requireRealFiles) {
      const st = fs.lstatSync(full);
      if (!st.isFile() || st.isSymbolicLink()) {
        errors.push(`${file}: row must be a real file`);
        continue;
      }
    }

    let obj;
    try {
      obj = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (error) {
      errors.push(`${file}: JSON parse failed: ${error.message}`);
      continue;
    }

    const schemaErrors = validate(schema, obj);
    for (const error of schemaErrors) errors.push(`${file}: ${error}`);
    if (schemaErrors.length) continue;

    const id = idFrom(obj);
    if (!filenameOk(file, id)) {
      errors.push(`${file}: filename must be '${id}.json' (got '${file}')`);
    }
    if (seenIds.has(id)) {
      errors.push(`${file}: duplicate ${duplicateIdLabel} '${id}'`);
    }
    seenIds.add(id);

    if (extraErrors) {
      errors.push(...extraErrors(obj, file, { dir, full }));
    }
    rows.push(obj);
  }

  rows.sort((a, b) => {
    const ia = idFrom(a);
    const ib = idFrom(b);
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
  const indexLines = summaryFrom
    ? rows.map((row) => JSON.stringify(summaryFrom(row)))
    : [];

  if (errors.length === 0 && indexPath) {
    const body = indexLines.length ? `${indexLines.join("\n")}\n` : "";
    atomicWrite(indexPath, body);
  }

  return { errors, rows, indexLines };
}
