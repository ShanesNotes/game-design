// Mechanical consistency checks for a SPEC.md decomposition (schemas/spec-decomposition).
//
// This does NOT judge whether the slicing is good — the decompose prompt (P18) owns
// that judgment, and the schema stays pure data-shape. This catches a decomposition
// that contradicts itself or its thesis, which is data corruption, not taste
// (gate policy in checkers, not schemas — ADR 0005):
//   - duplicate or non-contiguous slice ordering;
//   - the tracer bullet rule: the order-1 slice must be type "slice";
//   - depends_on pointing at unknown slices or at slices that come later;
//   - a chosen_loop_id that does not exist in the thesis;
//   - loop coverage: every verb of the chosen core loop must be covered by at
//     least one slice's loop_verbs_covered (the spec must implement its own loop).
export function specConsistencyErrors(spec, thesis = null) {
  if (!spec || typeof spec !== "object" || !Array.isArray(spec.slices)) {
    return ["spec decomposition missing slices"];
  }
  const errors = [];
  const ids = new Set();
  const orderOf = new Map();
  for (const s of spec.slices) {
    if (ids.has(s.id)) errors.push(`duplicate slice id '${s.id}'`);
    ids.add(s.id);
    orderOf.set(s.id, s.order);
  }
  const orders = spec.slices.map((s) => s.order).sort((a, b) => a - b);
  orders.forEach((o, i) => {
    if (o !== i + 1) {
      if (!errors.some((e) => e.startsWith("slice orders"))) {
        errors.push(`slice orders must be contiguous from 1 (got ${orders.join(", ")})`);
      }
    }
  });
  const first = spec.slices.find((s) => s.order === 1);
  if (first && first.type !== "slice") {
    errors.push(`order-1 slice '${first.id}' must be type "slice" (tracer bullet), got '${first.type}'`);
  }
  for (const s of spec.slices) {
    for (const dep of s.depends_on || []) {
      if (!ids.has(dep)) errors.push(`slice '${s.id}' depends on unknown slice '${dep}'`);
      else if (orderOf.get(dep) >= s.order) {
        errors.push(`slice '${s.id}' (order ${s.order}) depends on '${dep}' (order ${orderOf.get(dep)}) which does not come earlier`);
      }
    }
  }
  if (thesis) {
    const candidates = Array.isArray(thesis.core_loop_candidates) ? thesis.core_loop_candidates : [];
    const chosen = candidates.find((c) => c && c.id === spec.chosen_loop_id);
    if (!chosen) {
      errors.push(`chosen_loop_id '${spec.chosen_loop_id}' not found in thesis core_loop_candidates`);
    } else {
      const verbs = String(chosen.verbs || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
      const covered = new Set(
        spec.slices.flatMap((s) => s.loop_verbs_covered || []).map((v) => String(v).trim().toLowerCase())
      );
      for (const verb of verbs) {
        if (!covered.has(verb)) errors.push(`core loop verb '${verb}' is not covered by any slice's loop_verbs_covered`);
      }
    }
  }
  return errors;
}
