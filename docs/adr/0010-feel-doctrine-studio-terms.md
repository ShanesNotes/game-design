# ADR 0010 — Feel doctrine under studio terms (supersedes 0009)

- Status: **Accepted.**
- Date: 2026-07-10
- Supersedes: ADR 0009 (culled in T04 doctrine audit; not edited in place)
- Extends: ADR 0006 (spec pack terminal), ADR 0007/0008 (registers)
- Aligns: DESIGN-RECORD §5 (game feel vocabulary), §3 (forge verify gates)

## Context

ADR 0009 established feel as first-class design input and the design-canon
pointer. The studio founding record (DESIGN-RECORD) then locked vocabulary:
**game feel** is the only permitted term, and design owns falsifiable targets that
forge turns into verify gates. T04's quarantine rule forbids editing accepted
ADRs in place and forbids uncritically carrying banned terminology; 0009 is
therefore superseded by this re-derived decision rather than patched.

## Decision

1. **Feel doctrine** (`docs/feel-doctrine.md`): game feel is specified as
   falsifiable commitments, argued on paper, sliced first-class, proven
   downstream (co-dev and, for Godot packs, forge verify). Core vocabulary: the
   **golden moment** (repeatable 20–40s core experience as sensation + decision,
   no proper nouns), **feel targets** (3–6 commitments passing the **Adjective
   Test** — budgets, animation commitments, four-beat feedback chains, at least
   one audio commitment), and the **Blamable-Death Test** (failure must teach;
   unreadable deaths are findings). Structured metric fields on feel targets are
   a schema redesign (T05), not a vocabulary change.
2. **Thesis carries feel** — `game-thesis` carries `golden_moment` and
   `feel_targets`. P01 generates them; P07 attacks them as findings (never as
   depth points); P18 slices the tracer to include the golden moment's full
   feedback chain and lands every feel target in a slice. Feel is never a
   late-order polish pass.
3. **Human feel session in the pack** — `PLAYTEST_PLAN.md` carries a structured
   observer protocol alongside bot sessions (first-contact log, feel-target
   verification, feedback-chain audit, blamable-death attribution, golden-moment
   probe).
4. **Design-canon pointer** — optional `design_canon` (clone-able repo URL, never
   a local path). `package-spec` stamps it into `guards/guard-config.json` so the
   co-dev repo inherits the design system. Absent in the thesis → key absent.

## Alternatives rejected

- **Patch ADR 0009 in place.** Forbidden by T04 (no retroactive ADR content
  edits); supersede instead.
- **Feel axes in the depth vector.** Feel and depth fail differently; findings,
  not points.
- **A separate feel gate phase.** P07 already owns adversarial argument.

## Consequences

- Specs promise how the game feels in falsifiable terms; forge can gate them.
- DESIGN-RECORD §5 feel vocabulary is enforced; slang feel-jargon is absent from doctrine surfaces.
- Reversal triggers: if feel targets devolve into boilerplate, require per-verb
  targets or retire the field; if design_canon pointers rot, add reachability
  checks at package time.
