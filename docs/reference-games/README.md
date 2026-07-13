# Reference-game canon

Machine-readable **reference cards** for games the factory studies — not a
wishlist of games to clone. Cards live under `cards/*.json`, the ratified list
is `CANON.md`, and `index.jsonl` is the generated summary (one row per card).

## Phase-tiered roles

| When | Role |
|------|------|
| **Intake / office hours** | **Vocabulary** — named systems and loop shapes so grill answers stay precise ("loot + meta-progression" instead of "RPG stuff"). |
| **P07 depth red-team** | **Falsifier** — a card's depth mechanisms and anti-lessons pressure the thesis: "does our claim survive the same mechanism that carries this reference?" |
| **P18 decompose / packaging** | **Packaging template + system-BOM checklist** — lessons and `system_bom` rows remind the slice plan what subsystems a shipping shape usually needs. |

Pipeline hooks that *cite* cards land in a later slice (P01 / P07 / P18). This
directory is substrate only: schema, canon, validator, index.

## Tier 2 — genre index

Tier-2 rows live under `genre-index/*.json`, use the frozen vocabulary in
`TAXONOMY.md`, and are summarized in the generated `genre-index.jsonl`. They
are a lighter discovery surface than Tier-1 cards: one game has one row, while
primary and secondary memberships let that row appear in several generated
coverage counts.

The genre index is a NAVIGATION surface for agents, PULL-ONLY:

- It is NOT consulted for every game design idea or seed run, and is NEVER auto-injected into intake/grill context by default.
- It activates when the user points to a specific reference (or explicitly asks for reference options). Then it serves two functions: (a) route to the Tier-1 card if `card_ref` exists — the card is what a "full reference" means — or to the promotion path (disposition item 9) if not; (b) surface facet-neighbor rows as OPTIONS the agent can offer the user for game generation.

This directory remains substrate only. Pipeline hooks that activate the
pull-only lookup or promotion path land separately.

## Pigeonhole doctrine

**Never treat a reference as a target at thesis time.** The thesis must name its
own loop, moat, and depth vector. A canon entry is evidence and contrast — a
pigeonhole to escape, not a mold to pour into. If a pitch collapses to "like X
but with Y," kill or deepen until the falsifying difference is mechanical.

## Card files

- Path: `docs/reference-games/cards/<id>.json`
- Schema: `schemas/reference-card.schema.json`
- Membership: every card `id` must appear in `CANON.md`
- Status: `draft` | `audited` — only **audited** cards are citable by future
  pipeline hooks

`cards/_example.json` is a **fictional fixture** (not a real game). It proves the
schema and validator path; do not cite it as research.

## System BOM starter vocabulary

`system_bom[].system` is a free string. Prefer this starter set so indexes stay
comparable; the vocabulary may grow without a schema enum change:

`loot` · `xp` · `leveling` · `inventory` · `ui` · `skills` · `progression` ·
`win-loss-death` · `play-loop` · `save-state` · `quests` · `missions` ·
`leaderboards` · `economy` · `crafting` · `multiplayer` · `meta-progression`

## Validate / index

```bash
node scripts/validate-reference-cards.mjs
# also runs inside: npm run verify
```

Writes/refreshes `docs/reference-games/index.jsonl` (sorted by `id`; fields:
`id`, `title`, `genre_tags`, `register_mapping`, `status`).

```bash
node scripts/validate-genre-index.mjs
node scripts/genre-index-critic.mjs
```

The Tier-2 validator refreshes `genre-index.jsonl`, sorted by `id`, with one
greppable line keyed by title, design facets, market genres, and optional
Tier-1 `card_ref`.
