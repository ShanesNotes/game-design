// {{PLACEHOLDER}} substitution for the run and spec-pack templates. One home so
// init-game-run.mjs and package-spec.mjs cannot drift on placeholder syntax.
export function renderTemplate(text, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)), text);
}
