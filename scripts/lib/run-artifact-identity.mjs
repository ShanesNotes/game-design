// Leaf helpers shared by run-state and portfolio reads. Keeping identity and
// fenced-JSON parsing here prevents either domain module from importing the other.
export const SEED_ID_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export function isValidSeedId(id) {
  return typeof id === "string" && SEED_ID_RE.test(id);
}

export function extractFencedJson(text) {
  const match = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!match) return { obj: null, error: "no fenced ```json block found" };
  try { return { obj: JSON.parse(match[1]), error: null }; }
  catch (error) { return { obj: null, error: `embedded json is not parseable: ${error.message}` }; }
}
