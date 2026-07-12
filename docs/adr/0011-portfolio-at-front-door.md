# ADR 0011 — Portfolio at the front door

- Status: **Accepted.**
- Date: 2026-07-12
- Extends: ADR 0006 (spec pack terminal), ADR 0007/0008 (registers / BRIEF seam)
- Aligns: grill-refresh disposition (2026-07-12); consult-grok + consult-codex
- Evidence sources: eight design seed runs under `.tgf/seeds/`; four active-game
  theses (ember / lantern / skeleton / spark); david DEEPEN; antiphon HELD

## Context

The office-hours grill skill was fully specified (ten pressure fields, ≤1
human question) but dead on the default path: `init-game-run` entered at
`toolchain`, P00's PHASES list omitted `intake` and `deepen`, and **0 of 8**
real seed runs had an `intake/` directory. Theses were compiled generatively
from one-line seeds with no portfolio memory.

Empirical failure mode — portfolio monoculture when unopposed:

- The four active-game theses (ember, lantern, skeleton, spark) are one
  one-screen scarcity / timing loop reskinned; first-pass ADVANCE depth
  vectors were **identical 17/24** with near-verbatim evidence templates.
- The only contested designs came from real grilling: **david** (DEEPEN
  15→17 after one named transform) and **antiphon** (adversarial red-team
  knocked axes down; HELD unresolved). No KILL ever fired on the rubber-stamp
  path.
- Depth scores were self-scored judgment; the checker only caught internal
  inconsistency. Reviewer independence cannot be enforced by schema alone.

Two blind consults on the grill-refresh proposal (both NOT READY on the first
cut; orchestrator dispositions in
`.scratch/orchestrate/grill-refresh/DISPOSITION.md`) disagreed on whether
intake should become the **default entry** or fold into P01.

## Decision

1. **`intake` is the schema-gated default entry** for every new run. The
   office-hours grill writes `intake/office-hours.md` with a canonical fenced
   json block (`schemas/intake-grill.schema.json`), grounded in
   `npm run portfolio:digest` → `intake/portfolio-digest.json`. Legal exit is
   **`intake → toolchain` only** (never thesis). P00 routes both `intake` and
   `deepen`.
2. **Portfolio distinctness on every thesis** — checker-enforced
   `portfolio_distinctness` (nearest prior + falsifying difference; presence
   and seed-ID validated mechanically). Verb/register Jaccard was rejected:
   it misses the ember quartet (different verbs, same template).
3. **Depth-vector teeth** — per-axis `evidence` paths plus
   `review_provenance` on the verdict. Cite-or-zero as prompt text alone is a
   no-op (consult consensus).
4. **Reviewer independence at P07 is process doctrine.** The repo records
   provenance; it cannot enforce independence. Opposition (not token overlap)
   is the mechanism history supports.
5. **P18 fail-fast** uses the existing package dry-run:
   `npm run spec:package -- --seed-id <id> --require-manifest` (no new
   `spec:lint` script — consult-vetoed as a drift-prone duplicate).
6. **Empty `handoffs/` run dirs are culled** from `RUN_DIRS`; ledger +
   `manifest.spec_pack_path` already carry handoff truth. Existing on-disk
   seed dirs are left untouched.

## Consult positions on default-entry (recorded faithfully)

| Seat | Position on Q1 (default entry vs fold-in) |
| --- | --- |
| **Grok** (consult-grok) | **Dissent.** Prefer fold a short portfolio block into P01 (or a mandatory pre-json thesis section) for sharp seeds — less graph/schema/init churn, still schema-gateable. Keep `intake` optional for raw/vague/inherited repos. Forcing every seed through ten schema'd pressure fields risks **phase-theater / generative filler** (same "Generate, do not ask" failure as unopposed P01). If default entry stayed a phase, still repair the skill's illegal thesis jump and teach P00. |
| **Codex** (consult-codex) | **Adopt default entry.** Intake already exists in the state model; folding into P01 saves little and loses a **separately verifiable pressure artifact**. Sharp seeds may complete the grill without a human question. Required wiring: initializer enters intake; grill writes the artifact; transition is intake→toolchain; P01 consumes the grill. |

**Orchestrator ruling:** Codex's default-entry position is adopted (schema-gated
intake, digest-grounded grill, exit to toolchain). Grok's dissent is retained
in this ADR as the standing risk to watch (filler pressure fields). **Shane's
review is the veto point** on whether default-entry remains or is later folded
into P01 if the filler risk materializes.

## Alternatives rejected

- **Fold grill into P01 only** (Grok Q1) — lighter surface; rejected for now
  because the pressure artifact would no longer be independently phase-gated.
  Re-open if intake produces generative filler at scale.
- **Verb/register overlap gate** — fails the proven clone set; replaced by
  nearest-prior + falsifying difference.
- **Broad studio-context dossier at intake** (assets/lore/generation harvest)
  — wrong altitude; portfolio memory only at intake; availability stays at the
  P18 probe; capability at P02.
- **New `spec:lint` script** — duplicates `package-spec` dry-run; drift risk.
- **Second owner-intent channel** — BRIEF.md already is the seam.
- **Drawing post-complete revision as a phase edge** — would weaken
  complete-is-absorbing; revision remains a side-path (`spec:revise` /
  forge `--revise`).

## Consequences

- New runs enter at intake; P00 and the office-hours skill must agree with the
  run-state graph.
- Downstream Slice A owns digest script, intake-grill schema, thesis
  `portfolio_distinctness`, depth-vector evidence + provenance, and init entry
  wiring; this ADR is the doctrine anchor for both slices.
- Reversal triggers: if intake fields become boilerplate, fold pressure into
  P01 per Grok's dissent and demote intake to optional; if distinctness becomes
  checkbox prose, tighten mechanical checks or require adversarial second-reader
  provenance on ADVANCE.

## References

- Proposal / disposition: `.scratch/orchestrate/grill-refresh/PROPOSAL.md`,
  `DISPOSITION.md`
- Consults: `consult-grok.log`, `consult-codex.md` (same directory)
