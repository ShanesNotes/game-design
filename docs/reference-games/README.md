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
- It activates when the user points to a specific reference (or explicitly asks for reference options). Then it serves two functions: (a) route to the Tier-1 card if `card_ref` exists — the card is what a "full reference" means — or, when no card exists, to the promotion path: promotion triggers at intake when a seed names a Tier-2 reference as its nearest reference — a full Tier-1 card is authored and audited before thesis compilation, or the reference is dropped for that run. Shane ratifies promotions; (b) surface facet-neighbor rows as OPTIONS the agent can offer the user for game generation.

This directory remains substrate only. Pipeline hooks that activate the
pull-only lookup or promotion path land separately.

The absence of automatic pipeline use is enforced by the
`genre index is pull-only: never referenced by the seed/intake pipeline` test in
`tests/factory.test.mjs`.

### Storefront-genre aliases

The validator trims and lowercases each storefront genre, then performs an
exact alias-table lookup. Matching is case-insensitive but deliberately never
fuzzy: a false genre match is worse than a missing alias. Adding an alias changes
the ratified vocabulary bridge and therefore requires Shane's ratification, at
the same authority as a taxonomy change; it is never a worker convenience.

Batch E2-01 records the precedent (see `docs/doctrine-audit-ledger.md`, Classics
wave batch E2): when Space Invaders supplied only `Shooting`, outside the market
vocabulary with no ratified alias, the row was reported, dropped, and swapped
for Quake III Arena rather than gaining an alias.

### Ratifications & evidence reach

- Taxonomy v1 + 20-row pilot: ratified (Shane, 2026-07-13).
- Fill-to-floors corpus (71 rows): ratified (Shane, 2026-07-13).
- Classics doctrine (Shane, 2026-07-13): the classic canon (8/16-bit era
  onward) belongs in the index. Steam was an evidence hint, never a boundary:
  `storefront_genres` evidence may come from live listings or **archived
  storefront pages** of the game or a faithful re-release (`source_tier:
  archival-secondary`); `edition_pinned` records exactly which listing the
  evidence describes, while the row's facets describe the classic design.

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
