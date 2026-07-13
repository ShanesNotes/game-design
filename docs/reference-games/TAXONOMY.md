# Genre-index taxonomy v1

**Version:** `1.0.0`  
**Status:** v1 RATIFIED (Shane, 2026-07-13) — frozen; changes require a new taxonomy version

Rows declare `taxonomy_version: "1.0.0"`. Changing a value or a class boundary
requires a new taxonomy version; pilot rows must not silently redefine this
file. The design ontology is primary. Market genres are storefront-derived
coverage and discovery evidence, never the ontology and never a proxy for a
game's design.

## Design shape (primary ontology)

Every facet records exactly one `primary` membership and zero or more distinct
`secondary` memberships. Primary means the shape that best predicts the game's
repeated decisions; secondary means a materially present alternate shape, not
a synonym or a weaker marketing label.

### `register`

| Value | Definition |
|---|---|
| `mechanics-first` | Systemic choices, execution, or optimization carry the repeatable depth. |
| `narrative-first` | Authored or reactive story choices carry the repeatable depth. |
| `hybrid` | Mechanics and narrative/world consequences are mutually load-bearing. |
| `world-first` | Place, exploration, ecology, or persistent-world change carries the repeatable depth. |

### `loop_class`

| Value | Definition |
|---|---|
| `execution` | Repeat value comes from timing, aiming, movement, or other embodied performance. |
| `optimization` | Repeat value comes from improving plans, builds, routes, or resource conversion. |
| `discovery` | Repeat value comes from revealing rules, spaces, information, or consequences. |
| `expression` | Repeat value comes from constructing, composing, role-playing, or choosing a personal form. |
| `social-coordination` | Repeat value comes from coordinating with or reading other players. |

### `session_structure`

| Value | Definition |
|---|---|
| `rounds` | A session is a sequence of short, resettable matches or scenarios with explicit outcomes. |
| `runs` | A session is an attempt with substantial temporary state that resets on success or failure. |
| `chapters` | A session advances through authored missions, cases, levels, or story beats. |
| `continuous` | A session enters and leaves an ongoing world or open activity without a required terminal outcome. |

### `progression_form`

| Value | Definition |
|---|---|
| `fixed-kit` | Capability is substantially available from the start; learning, score, or rank is the durable gain. |
| `run-reset` | Material capability is accumulated inside an attempt and substantially resets afterward. |
| `persistent-unlocks` | Durable currency, equipment, skills, or options expand capability across sessions. |
| `authored-campaign` | Durable progress is primarily completion of authored missions, levels, or story states. |
| `open-ended` | Durable progress is player-defined construction, collection, economy, or world state without a final campaign spine. |

### `player_count`

| Value | Definition |
|---|---|
| `solo` | The reference loop is fully realized by one player. |
| `cooperative` | Two or more players collaborate toward shared outcomes. |
| `competitive` | Players or teams directly contest outcomes. |
| `massively-multiplayer` | A persistent shared population materially shapes the reference loop. |

## Market genres (coverage evidence)

`market_genres` uses the English Steamworks **main genre** vocabulary as
observed for taxonomy v1: `action`, `adventure`, `casual`, `experimental`,
`puzzle`, `racing`, `rpg`, `simulation`, `sports`, `strategy`, `tabletop`.
The source vocabulary is Steam's storefront tag documentation:
<https://partner.steamgames.com/doc/store/tags?language=english>.

Rows again use one primary and distinct secondary memberships. These labels
exist to discover coverage and cross-genre neighbors; the critic never treats
them as design facets.

## Evidence classes and thresholds

Every evidence item preserves the raw observation in `value_or_range` and
names one class below. `class_definition` is the exact stable identifier shown
here. A validator derives the expected class from numeric observations; authors
do not choose a looser class by hand.

### `steam_user_reviews`

The observation is Steam's all-language, all-purchase `total_reviews` value at
`observed_at`. It is a platform-footprint signal, not a quality, sales, or fun
claim. Steam documents the endpoint and field at
<https://partner.steamgames.com/doc/store/getreviews?language=english>.

| Numeric threshold | `class` | `class_definition` |
|---|---|---|
| 0–9,999 | `review-niche` | `taxonomy-v1#steam-user-reviews/review-niche` |
| 10,000–99,999 | `review-established` | `taxonomy-v1#steam-user-reviews/review-established` |
| 100,000+ | `review-breakout` | `taxonomy-v1#steam-user-reviews/review-breakout` |

### `storefront_genres`

The raw observation is the genre list returned by the named storefront for the
named game at `observed_at`, preserved as an array of exact storefront strings.

| Classification rule | `class` | `class_definition` |
|---|---|---|
| Exact fetched storefront list, preserved without inference | `storefront-listed` | `taxonomy-v1#storefront-genres/storefront-listed` |

### Optional production-scale metrics

These metrics may appear in `production_scale_evidence` only when a fetched
source states the raw value or range. Unknown scale stays unknown.

| `metric_type` | Threshold | `class` | `class_definition` |
|---|---|---|---|
| `development_team_size` | 1 person | `team-solo` | `taxonomy-v1#development-team-size/team-solo` |
| `development_team_size` | 2–5 people | `team-micro` | `taxonomy-v1#development-team-size/team-micro` |
| `development_team_size` | 6–20 people | `team-small` | `taxonomy-v1#development-team-size/team-small` |
| `development_team_size` | 21+ people | `team-large` | `taxonomy-v1#development-team-size/team-large` |
| `development_time_months` | 0–12 months | `time-short` | `taxonomy-v1#development-time-months/time-short` |
| `development_time_months` | 13–36 months | `time-medium` | `taxonomy-v1#development-time-months/time-medium` |
| `development_time_months` | 37+ months | `time-long` | `taxonomy-v1#development-time-months/time-long` |

## Source tiers

| `source_tier` | Definition |
|---|---|
| `primary-platform` | First-party storefront or platform API reporting its own live data. |
| `primary-developer` | Developer/publisher statement, postmortem, credits, or financial report. |
| `reputable-secondary` | Established reporting or research that names its method or primary source. |
| `archival-secondary` | Stable archive or database preserving a source that is no longer directly available. |

## Completeness rules

The critic counts each unique row once for every declared primary or secondary
design-facet value. A covered value needs at least three rows. A facet value is
hybrid-participating when at least one row declares it as a secondary value; all
rows covering that value must then span at least two distinct primary-or-secondary
market genres, or the hybrid lacks cross-genre evidence and is reported. Counts
are generated, never stored in row files.
