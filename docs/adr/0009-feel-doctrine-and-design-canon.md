# ADR 0009 — Feel doctrine and the design-canon pointer

- Status: **Accepted.** Owner-directed (2026-07-02): a studio-quality pass on
  the factory itself — the pipeline proved designs *deep* but never asked how
  they *feel*, and packs could not inherit an existing design system.
- Date: 2026-07-02
- Extends: ADR 0006 (spec pack terminal), ADR 0007/0008 (registers).

## Context

Every artifact in the pipeline interrogates decision structure: the twelve
depth axes, the falsifiers, and the playtest metrics all measure choices,
tradeoffs, and variation. Nothing asked about moment-to-moment sensation —
input response, animation commitment, feedback beats, audio, legible failure.
A thesis could design-lock as a brilliant spreadsheet; "feel" would surface,
if ever, as a late "juice pass" slice, which is exactly backwards: feel is a
design input that shapes verbs, budgets, and engine choices.

Playtesting was bots-only. Bots measure divergence and stability; they cannot
report whether a death felt fair or where a player first leaned in.

Separately, some seeds arrive with an existing design system (tokens, grammar,
asset prompts) in its own repo. The pack had no slot for it, so the co-dev repo
would invent a look the owner already owned.

## Decision

1. **Feel doctrine** (`docs/feel-doctrine.md`): feel is specified as
   falsifiable commitments, argued on paper, sliced first-class, proven in the
   co-dev repo. Core vocabulary: the **golden moment** (repeatable 20–40s core
   experience as sensation + decision, no proper nouns), **feel targets** (3–6
   commitments passing the **Adjective Test** — budgets, animation commitments,
   four-beat feedback chains, at least one audio commitment), and the
   **Blamable-Death Test** (failure must teach; unreadable deaths are findings).
2. **Thesis carries feel** — `game-thesis` gains optional `golden_moment`
   (string) and `feel_targets` (string array). P01 generates them; P07 attacks
   them as findings (never as depth points — the anti-boring gate's 12 axes and
   floors are untouched); P18 slices the tracer to include the golden moment's
   full feedback chain and lands every feel target in a slice.
3. **Human feel session in the pack** — `PLAYTEST_PLAN.md` gains a structured
   observer protocol alongside bot sessions: first-contact log, feel-target
   verification, feedback-chain audit, blamable-death attribution log,
   golden-moment probe; metrics gain input latency and death-attribution rate.
   (The same edit closes an ADR 0008 gap: the plan now states the world-first
   falsifier readings, not just narrative-first.)
4. **Design-canon pointer** — `game-thesis` gains optional `design_canon` (a
   clone-able repo URL, never a local path; the leakage gate enforces the
   latter). `package-spec` stamps it into `guards/guard-config.json` so the
   co-dev repo inherits the design system instead of inventing a look. Absent
   in the thesis → key absent in the config.

## Alternatives rejected

- **Feel axes in the depth vector.** Feel and depth fail differently and are
  fixed differently; folding feel into the 24-point floor would let strong
  systems scores mask a spreadsheet-feel design (and vice versa). Findings, not
  points.
- **A separate feel gate phase.** Another phase means another artifact and
  transition for what is, on paper, argumentation — P07 already owns adversarial
  argument; feel attacks live there.
- **A feel guard in the pack.** Feel targets need play or instrumentation;
  a repo-state guard can only check that reports exist, which
  `playtest_report_required` already does.
- **Copying the design canon into the pack.** Packs stay small and the canon
  stays authoritative in its own repo; a pointer inherits updates, a copy forks.

## Consequences

- Specs now promise how the game feels in falsifiable terms, and the co-dev
  repo inherits both those promises and (when declared) a design system.
- The red-team gets sharper kill criteria for the most common AI-built-game
  failure: mechanically sound, sensorially dead.
- Reversal triggers: if feel targets devolve into boilerplate ("<100ms" pasted
  into every thesis unexamined), require per-verb targets or retire the field;
  if design_canon pointers rot (dead URLs in packs), add a reachability check
  at package time.
