# P07 — Design Depth Red-Team (the fertilization gate)

ROLE: Adversary. You want the idea to fail if it is shallow. This is the paper
gate between a compiled thesis and any decomposition work — nothing gets sliced
into a spec until the design survives you.

INPUT:
- GAME_THESIS.md (the fenced JSON block is the canonical object)
- GAME_SEED.md
- `intake/portfolio-digest.json` — required review input; re-read it even though
  the thesis already carries a nearest-prior disposition
- BRIEF.md if present — the owner's north-star qualities are CLAIMS TO FALSIFY,
  not credit: score every axis against the design's rules, never against the
  brief's aspirations. A thesis that name-checks the brief without mechanism
  is a finding.
- docs/anti-boring-gate.md
- factory.config.toml [gates]

REGISTER:
Resolve the register from the thesis (`design_register`, default
mechanics-first) and record it in `reviews/depth-vector.json` as `register` —
the vector is judged by that register's mandatory axes (ADR 0007), and
validate-artifacts rejects a vector whose register contradicts the thesis.
Under narrative-first, read the falsifiers as re-aimed in
docs/anti-boring-gate.md § Design registers (Naked Structure, Dominant-Choice,
Next-Session, Two-Chooser divergence); under world-first, as Naked Map,
Beeline, Return, and Two-Walker divergence (same section). A register is not
a discount.

TASK:
Score the 12-axis depth vector 0/1/2 by adversarial argument against the thesis —
no playtest exists yet, so every score must cite the design itself. In
`reviews/depth-vector.json`, emit `schema_version: "2.0.0"` and make `evidence`
an object with exactly the 12 axis keys; each value is an exact field path in the
thesis canonical JSON (for example `core_loop_candidates[0].verbs`). The checker
resolves every path and fails a missing citation. The verdict argument explains
which rule, resource, or constraint produces the axis and what would falsify it. Run the
paper falsifiers:

- **Naked Mechanics Test** — strip the theme; is the bare system of the chosen
  loop still interesting? Name the system in one sentence without the fantasy.
  (narrative-first: **Naked Structure Test** — strip prose, proper nouns, art;
  the choice-consequence graph and interaction grammar must carry the interest.
  world-first: **Naked Map Test** — strip names, lore, art; the spatial graph —
  gates, keys, loops, shortcuts, landmark relations — must carry the interest.)
- **Dominant-Move Test** — search for the action or sequence that wins on paper.
  If one ordering of the loop verbs dominates, say so and score accordingly.
  (narrative-first: **Dominant-Choice Test** — if one stance is optimal across
  scenes with no differentiated cost, fail. world-first: **Beeline Test** — if
  beelining objectives ignores the world at no differentiated cost, the world
  is scenery; fail.)
- **Second-Session Test** — what, structurally, is different on a second run?
  "More levels" and "better art" do not count. (narrative-first: **Next-Session
  Test** — continuation pull via accumulated state, new verbs, and escalating
  stakes is legitimate; "more of the same scenes" is not. world-first:
  **Return Test** — returning to a known place with new capability must yield
  genuinely new access or meaning; backtracking-to-flip-a-switch does not count.)
- **Two-Bot Test (deferred)** — cannot run on paper. Instead, verify the thesis
  carries falsifiable `bot_success_criteria` precise enough for the co-dev repo to
  run this test later. Missing or vague criteria is a finding, not a pass.
  (narrative-first: the criteria must include random-vs-intentional chooser
  divergence over story state. world-first: random-walker vs curious-walker
  divergence over the discovered-content set.)

ATTACK:
- Find the choice that is not a real choice.
- Find the point where a run is decided and how early it arrives.
- Find the resource with no tension (always enough, or never enough).
- Explain why a second session exists or admit it does not.
- narrative-first: find the choice whose consequence is cosmetic; find the scene
  that is a cutscene wearing a verb; find where the story is identical no matter
  what the player chose; for an adapted or well-known story, reject any
  uncertainty score that leans on plot surprise instead of system-level unknowns.
- world-first: find the place that is only scenery (nothing to decide there);
  find the "secret" that is a pixel-hunt instead of learnable world grammar;
  find the capability that never re-keys old ground; reject any awe claim that
  is art direction wearing a mechanic — withheld explanation must be backed by
  real hidden state or topology, not mood.

FEEL (docs/feel-doctrine.md — findings, not depth points):
- **Adjective Test** — a feel target that is an adjective ("responsive",
  "weighty") is a wish; each must be falsifiable by play or instrumentation.
- Find the core verb missing a feedback beat (anticipation / action / impact /
  aftermath) — an incomplete verb is a finding.
- **Blamable-Death Test** — if the design has failure, find the death the
  player will blame on the game (unreadable danger, off-screen cause,
  undisclosed input commitment). If the thesis never names its
  failure-feedback loop, that is the finding.
- A golden moment that is plot or a feature list ("confront the giant") is a
  finding — it must be sensation plus decision, no proper nouns.

PORTFOLIO DISTINCTNESS (named finding, independent of the depth floor):
- Attack `portfolio_distinctness` against the digest's nearest prior design.
- Disposition the finding explicitly in `ANTI_BORING_VERDICT.md` on a line that
  names both **Distinctness** and the prior seed id (or `none` when no prior
  thesis exists). A passing depth total does not clear this finding.
- If this vector's 12 scores exactly match a prior ADVANCE vector, treat that as
  a tripwire: the disposition must name every matching seed and explain why the
  evidence paths support distinct scores or why identical scores remain honest.

REFERENCE FALSIFIER (docs/reference-games/ — audited cards only; findings, not depth points):
- Collect every canon id named as near by the thesis or intake (`nearest canon: …`,
  portfolio prose, office-hours Status-quo / Reviewer-concern).
- Keep only ids present in `docs/reference-games/index.jsonl` with `status`
  exactly `audited`. Discard draft, fixture, and unknown ids.
- For each remaining id, read `docs/reference-games/cards/<id>.json` in full.
  Each `depth_mechanisms[]` entry and each `anti_lessons[]` string becomes an
  attack vector: "reference <id> carries mechanism M in the same slot — does the
  thesis survive the comparison or does the slot sit empty?"
- Disposition under a **Reference falsifier** heading in `ANTI_BORING_VERDICT.md`:
  one line per attack vector, or exactly one line
  `Reference falsifier: SKIPPED (reference canon empty)` when zero named-and-audited
  cards remain. Never invent a card; never score axes from cards.

OUTPUT:
- `reviews/ANTI_BORING_VERDICT.md` — the argument, per-axis citations, and verdict.
- `reviews/depth-vector.json` — schema `schemas/depth-vector`, scores + total +
  register + per-axis evidence + review provenance + verdict. `review_provenance`
  records `{mode: "independent" | "same-context", reviewer_note: <free text>}`;
  record how the review ran without inventing independence.

VERDICT:
ADVANCE | DEEPEN | KILL

Verdict-line output contract (machine-read): `scripts/generate-g1-brief.mjs`
parses the ruling out of `reviews/ANTI_BORING_VERDICT.md` and fails loudly when
it is missing or malformed. State the ruling in exactly one of these forms:

- `VERDICT: <RULING>` on its own line (a markdown heading prefix such as
  `## VERDICT: ADVANCE` and bold markers are tolerated), or
- a `## Verdict` heading line followed by the ruling in bold on the next
  non-empty line, e.g. `**ADVANCE**`.

`<RULING>` is exactly one of `ADVANCE`, `DEEPEN`, `KILL`.

- **ADVANCE** requires total ≥ 16/24 with the register's six mandatory axes
  nonzero — mechanics-first/hybrid: Choice, Tradeoff, Pressure, Uncertainty,
  Mastery, Replayable Variation; narrative-first swaps Replayable Variation for
  Progression; world-first requires Progression and Expansion Headroom instead
  of Mastery and Replayable Variation. ADVANCE is **design-lock**: the run may
  proceed to engine-profile and decompose.
- **DEEPEN**: name exactly one highest-leverage transform to apply to the thesis.
  Advance the run to `deepen` (advance-run increments `deepen_attempt_count` on
  entry and refuses a third attempt), then re-enter thesis; two attempts, then KILL.
- **KILL**: the verdict must say what evidence would have changed it, so the next
  seed brief starts smarter.
