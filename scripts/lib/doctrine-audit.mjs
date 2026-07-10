// Doctrine audit ledger helpers (DESIGN-RECORD §8 / T04).
// Pure functions so tests can prove missing-row failure without mutating the repo.

/** Paths passed to `git ls-files` for the audit universe. */
export const AUDIT_UNIVERSE_PATHS = ["docs", ".factory/prompts", "schemas", "templates", "hooks"];

export const DISPOSITIONS = new Set(["reaffirmed", "rewritten", "culled"]);

/**
 * Parse machine-readable rows from docs/doctrine-audit-ledger.md.
 * Row form: | `path` | disposition | rationale |
 * Returns Map<path, { disposition, rationale }>. On duplicate path, last wins
 * and the path is recorded in `duplicates`.
 */
export function parseAuditLedger(text) {
  const rows = new Map();
  const duplicates = [];
  const re = /^\|\s*`([^`]+)`\s*\|\s*(reaffirmed|rewritten|culled)\s*\|\s*(.*?)\s*\|?\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const path = m[1].trim();
    const disposition = m[2];
    const rationale = m[3].replace(/\s*$/, "").replace(/\|$/, "").trim();
    if (rows.has(path)) duplicates.push(path);
    rows.set(path, { disposition, rationale });
  }
  return { rows, duplicates };
}

/**
 * Exhaustiveness errors for a universe file list vs parsed ledger rows.
 * @param {string[]} universeFiles paths from git ls-files (current tree)
 * @param {{ rows: Map<string,{disposition:string,rationale:string}>, duplicates?: string[] }} parsed
 * @returns {string[]}
 */
export function auditErrors(universeFiles, parsed) {
  const errors = [];
  const { rows, duplicates = [] } = parsed;
  for (const d of duplicates) errors.push(`duplicate ledger row: ${d}`);
  if (rows.size === 0) {
    errors.push("doctrine-audit-ledger.md has no machine-readable rows");
    return errors;
  }
  const universe = [...new Set(universeFiles)];
  for (const f of universe) {
    if (!rows.has(f)) errors.push(`universe file missing from audit ledger: ${f}`);
  }
  for (const [p, { disposition, rationale }] of rows) {
    if (!DISPOSITIONS.has(disposition)) {
      errors.push(`invalid disposition for ${p}: ${disposition}`);
    }
    if (!rationale || !rationale.trim()) {
      errors.push(`empty rationale for ${p}`);
    }
    // Culled surfaces must not remain tracked in the live universe.
    if (disposition === "culled" && universe.includes(p)) {
      errors.push(`culled but still tracked: ${p}`);
    }
  }
  return errors;
}
