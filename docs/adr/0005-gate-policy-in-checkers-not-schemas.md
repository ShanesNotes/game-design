# ADR 0005 — Gate policy lives in checkers, not in JSON schemas

- Status: **Accepted.** New architectural decision made during the 2026-06-06
  architecture-deepening pass; it does not reverse any prior user-accepted decision,
  so it is self-Accepted (cf. ADR 0004, which does and is not).
- Date: 2026-06-06

## Context

The anti-boring gate's thresholds (depth total ≥16/24 with six required axes
nonzero; dominant move <70% of actions) lived only in prose. Nothing caught a gate
artifact whose own numbers contradicted its verdict — e.g. a depth vector with
`verdict: ADVANCE` but `total: 8`, or a `total` that didn't equal the sum of its
axes, or a playtest claiming `dominant_move: false` while its own
`action_distribution` showed one action at 90%.

A deepening analysis proposed closing this by encoding the thresholds directly in
the JSON schemas (computed fields, cross-field minimums). Several independent
reviewers rejected that: the schemas are the **artifact stratum** (what an agent
*decided*), while the gate is a **behavioral contract** owned by the depth red-team
(P07). Encoding gate policy into schemas couples the two strata, creates a second
source of truth for the gate algorithm, and conflicts with `CONTEXT.md`'s stated
choice that "the ≥16 total and nonzero-axes rule is applied by the depth red-team,
not by the schema."

## Decision

1. **Schemas stay pure data-shape.** They validate types, enums, ranges, required
   keys, and `additionalProperties:false`. They do **not** encode gate thresholds or
   cross-field policy.
2. **Gate policy lives in a separate checker** — `scripts/lib/anti-boring-gate.mjs`,
   surfaced as `validate-artifacts --check gate` (and `--check gate --file <artifact>`
   for a real run artifact). It rejects only artifacts that contradict **their own
   numbers** (internal consistency), which is data integrity, not judgment.
3. **The checker does not decide a verdict.** P07 still owns ADVANCE/DEEPEN/KILL.
   The checker only forbids an artifact from *claiming* a verdict its own numbers
   don't support.

The same principle governs the run-state guards (phase-transition legality,
phase-gated artifacts, question/deepen budgets): they read the ledger/manifest the
agent produced and check it for self-consistency, rather than encoding policy in the
manifest schema.

## Alternatives considered

- *Encode thresholds in the depth-vector / branch-score schemas* (rejected): couples
  artifact and orchestration strata; dual source of truth; reverses the documented
  P07-owns-the-gate choice without ratification.
- *Make the gate a blocking hook* like `scope_brake` (rejected for the verdict
  itself): the verdict is evidence-synthesis judgment, not a file-edit guardrail.
  (A consistency *checker* is fine; a verdict *decider* is not.)
- *Leave the gate in prose only* (rejected): a central doctrine claim with zero
  mechanical check is exactly the "warnings are not enough" failure the factory rejects.

## Consequences

- Adding or changing a gate threshold is a one-line change in
  `scripts/lib/factory-contract.mjs` (`THRESHOLDS`), consumed by the checker and the
  guards; a test asserts it stays in sync with `factory.config.toml`.
- The example fixtures are proven internally gate-consistent on every `npm run verify`
  (the `gate` check is in the default `all` set).
- Future gate rules (new falsifiers, new axes) are added to the checker, never to the
  schema. If a rule genuinely needs to constrain artifact *shape* (not policy), that
  belongs in the schema; the dividing line is "shape vs. threshold/cross-field policy".
