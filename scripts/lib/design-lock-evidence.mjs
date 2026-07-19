import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate-json-schema.mjs";
import {
  depthVectorConsistencyErrors, feelTargetRequiredForAdvanceErrors
} from "./anti-boring-gate.mjs";
import { depthVectorPortfolioErrors, isPortfolioRun } from "./portfolio-memory.mjs";

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEPTH_VECTOR_SCHEMA = JSON.parse(
  fs.readFileSync(path.join(FACTORY_ROOT, "schemas", "depth-vector.schema.json"), "utf8")
);

// Owns the evidence walk and the composition of schema, portfolio, gate,
// register, and feel policy for design-lock. A valid ADVANCE is evidence; a
// filename or verdict alone is not.
export function designLockEvidenceErrors({
  reviewsDir,
  thesis,
  manifest,
  portfolioDigest = null,
  requirePassing = false,
  phase = manifest?.current_phase,
  cwd = process.cwd()
}) {
  const errors = [];
  const portfolioRun = isPortfolioRun(manifest);
  if (!requirePassing && !portfolioRun) return errors;

  const vectorFiles = [];
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    if (fs.lstatSync(dir).isSymbolicLink()) {
      errors.push(`reviews path must not be a symlink: ${path.relative(cwd, dir)}`);
      return;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name === "depth-vector.json") {
        if (fs.lstatSync(file).isSymbolicLink()) {
          errors.push(`reviews depth vector must not be a symlink: ${path.relative(cwd, file)}`);
        } else {
          vectorFiles.push(file);
        }
      }
    }
  })(reviewsDir);

  let passing = false;
  for (const file of vectorFiles) {
    const relativeFile = path.relative(cwd, file);
    let vector;
    try { vector = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch {
      errors.push(`reviews depth vector not parseable JSON: ${relativeFile}`);
      continue;
    }
    const vectorErrors = validate(DEPTH_VECTOR_SCHEMA, vector);
    vectorErrors.forEach((error) => errors.push(`reviews depth vector ${error}: ${relativeFile}`));
    if (portfolioRun) {
      const verdictPath = path.join(reviewsDir, "ANTI_BORING_VERDICT.md");
      const verdictText = fs.existsSync(verdictPath) ? fs.readFileSync(verdictPath, "utf8") : "";
      depthVectorPortfolioErrors(vector, thesis, portfolioDigest, verdictText)
        .forEach((error) => {
          vectorErrors.push(error);
          errors.push(`${error}: ${relativeFile}`);
        });
    }
    if (vector.verdict !== "ADVANCE"
      || vectorErrors.length
      || depthVectorConsistencyErrors(vector).length) continue;

    const vectorRegister = vector.register ?? "mechanics-first";
    const thesisRegister = thesis?.design_register ?? "mechanics-first";
    if (vectorRegister !== thesisRegister) {
      errors.push(`reviews depth vector register '${vectorRegister}' contradicts thesis design_register '${thesisRegister}': ${relativeFile}`);
      continue;
    }
    const feelErrors = feelTargetRequiredForAdvanceErrors(thesis, vector.verdict);
    if (feelErrors.length) {
      feelErrors.forEach((error) => errors.push(`${error}: ${relativeFile}`));
      continue;
    }
    passing = true;
  }

  if (requirePassing && !passing) {
    errors.push(`current_phase '${phase}' is past design-review but reviews/ has no gate-passing depth vector (design-lock: verdict ADVANCE, total >=16, required axes nonzero)`);
  }
  return errors;
}
