# Domain language — game-design

> **This file defers to [`CONTEXT.md`](../../CONTEXT.md).** CONTEXT.md is the
> single source of truth for what **game-design** *is* (design/spec discipline in
> game-studio; formerly tiny-game-factory) and what every term means. This
> glossary is a quick agent-facing reference for borrowed skills (e.g.
> `grill-with-docs`) that need to ground their terminology. Where this file and
> CONTEXT.md ever disagree, CONTEXT.md wins — fix this file, not CONTEXT.md.
> Studio-level layout and contracts: DESIGN-RECORD.md at the studio root.

## Glossary

- **Design discipline** — The durable orchestration harness in
  `/home/ark/game-studio/design/` (package name `game-design`); owns doctrine,
  prompts, schemas, hooks, validators, ledgers. It is never itself a game
  (ADR 0001; DESIGN-RECORD §3).
- **Seed** — A one-sentence game idea (or an inherited repo) that design
  fertilizes into a depth-gated thesis and an issue-sliced spec pack (ADR 0006).
- **GAME_SEED** — The raw seed input captured at intake, before any compilation into thesis or structure.
- **GAME_THESIS** — The compiled, sharpened statement of intended fantasy and core loop produced by `tgf-seed-compile` as `GAME_THESIS.md`; gate before any engine choice.
- **Core loop / core-loop candidate** — The minimal repeated interaction that carries the fun; a *candidate* is one such loop still competing for proof, not yet locked.
- **Tracer-bullet slice** — The order-1, type-`slice` entry in the spec: the thinnest end-to-end proof of the core loop, built downstream, never in design.
- **Depth vector** — Twelve axes scored 0/1/2 (`schemas/depth-vector`); design-lock needs total ≥ 16/24 with the register's six mandatory axes nonzero (ADR 0007: mechanics-first/hybrid — Choice, Tradeoff, Pressure, Uncertainty, Mastery, Replayable Variation; narrative-first swaps Replayable Variation for Progression).
- **Anti-boring gate (four falsifiers)** — The pass/fail gate run on paper against the thesis at design-review: Naked Mechanics, Dominant-Move, and Second-Session argued analytically; Two-Bot deferred into the spec as `bot_success_criteria` obligations (`docs/anti-boring-gate.md`). Under a narrative-first register the falsifiers are re-aimed (Naked Structure, Dominant-Choice, Next-Session, Two-Chooser divergence).
- **Design register** — The thesis's declared depth locus (`design_register`: `mechanics-first` default | `narrative-first` | `hybrid` | `world-first`, ADR 0007/0008). Routes the gate's mandatory axes and falsifier readings and travels with the artifacts; never a depth discount.
- **Design-lock** — The `ADVANCE` verdict from the design red-team; the only door to engine-profile and decompose. Fun-lock remains downstream doctrine inside the spec pack / forge verify.
- **Game feel** — The only permitted term for moment-to-moment sensation (DESIGN-RECORD §5 vocabulary lock). Design owns falsifiable feel targets; forge turns them into verify gates.
- **Spec decomposition** — `SPEC.md` (`schemas/spec-decomposition`): a chosen loop, an out-of-scope list, and ordered slices (tracer bullet first) with falsifiable acceptance and evidence requirements. Issue = slice (1:1).
- **Spec pack** — Design's terminal artifact (ADR 0006): the exported folder of spec, issues, thesis, review, PLAYTEST_PLAN, guards, and evidence schemas. Forge-manifest emission is T06.
- **Forge manifest** — Machine-readable design→forge interface (studio `contracts/`); semantic requests only, no filesystem paths (DESIGN-RECORD §4).
- **Verdict** — A gate decision by the depth red-team: `ADVANCE` | `DEEPEN` (name one transform) | `KILL`.
- **Manifest** — `.tgf/seeds/{seed-id}/manifest.json`; its `current_phase` is the resumption source of truth. Manifest beats memory — agents coordinate through artifacts, never chat.
- **Execution ledger** — The append-only record of evidence-backed phase transitions for a seed; resuming from a terminal phase requires a ledger transition, not prose.
- **Run state** — Per-seed durable temporal truth under `.tgf/seeds/{seed-id}/` (manifest, ledger, thesis, decisions, SPEC, issues, reviews, handoffs).
- **Spec pack root** — Where the pack is exported: only by `package-spec.mjs --write` (path via `--to` or configured default); separate from design (ADR 0003). Studio product games live under `game-studio/games/`.
- **Engine profile / ADR** — The scored, reversible engine decision recorded after the thesis as `decisions/0001-engine-profile.md`; there is no default engine before `GAME_THESIS.md` (ADR 0002). Godot-4 packs may enter forge; others co-dev only.
- **Module card** — A schema-valid reusable primitive candidate with provenance, engine-fit notes, interfaces, deterministic/bot hooks, adoption guard, and slice acceptance; it is evidence, not copied code.
- **Programmer art** — Throwaway placeholder visuals used so the fun question can be answered before any art investment; never counts toward depth or anti-boring passes.
- **Kill criteria** — The conditions that justify a `KILL` verdict — a loop that fails the falsifiers or cannot clear the depth minimum — ending pursuit of that branch or seed.

## Usage rules for skills

- **Write only inside this design repo.** `grill-with-docs` and other borrowed
  doc skills may create/edit files within `/home/ark/game-studio/design/` only.
  Never mutate source repos, evidence, or exported spec packs.
- **Treat seed run state and exported packs as read-only evidence.** Read
  `.tgf/seeds/**` and exported pack dirs to ground terminology; do not edit them.
- **Keep this glossary concise.** One tight sentence per term; defer detail to
  CONTEXT.md and the linked docs rather than restating it here.
- **Never leak this vocabulary into an exported spec pack.** Design terms,
  ledgers, and skill docs stay in design (separation is absolute, ADR 0003).
