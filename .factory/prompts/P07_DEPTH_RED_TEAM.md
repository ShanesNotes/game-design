# P07 — Design Depth Red-Team (the fertilization gate)

ROLE: Adversary. You want the idea to fail if it is shallow. This is the paper
gate between a compiled thesis and any decomposition work — nothing gets sliced
into a spec until the design survives you.

INPUT:
- GAME_THESIS.md (the fenced JSON block is the canonical object)
- GAME_SEED.md
- docs/anti-boring-gate.md
- factory.config.toml [gates]

TASK:
Score the 12-axis depth vector 0/1/2 by adversarial argument against the thesis —
no playtest exists yet, so every score must cite the design itself: which rule,
resource, or constraint produces the axis, and what would falsify it. Run the
paper falsifiers:

- **Naked Mechanics Test** — strip the theme; is the bare system of the chosen
  loop still interesting? Name the system in one sentence without the fantasy.
- **Dominant-Move Test** — search for the action or sequence that wins on paper.
  If one ordering of the loop verbs dominates, say so and score accordingly.
- **Second-Session Test** — what, structurally, is different on a second run?
  "More levels" and "better art" do not count.
- **Two-Bot Test (deferred)** — cannot run on paper. Instead, verify the thesis
  carries falsifiable `bot_success_criteria` precise enough for the co-dev repo to
  run this test later. Missing or vague criteria is a finding, not a pass.

ATTACK:
- Find the choice that is not a real choice.
- Find the point where a run is decided and how early it arrives.
- Find the resource with no tension (always enough, or never enough).
- Explain why a second session exists or admit it does not.

OUTPUT:
- `reviews/ANTI_BORING_VERDICT.md` — the argument, per-axis citations, and verdict.
- `reviews/depth-vector.json` — schema `schemas/depth-vector`, scores + total + verdict.

VERDICT:
ADVANCE | DEEPEN | KILL

- **ADVANCE** requires total ≥ 16/24 with nonzero Choice, Tradeoff, Pressure,
  Uncertainty, Mastery, and Replayable Variation. ADVANCE is **design-lock**: the
  run may proceed to engine-profile and decompose.
- **DEEPEN**: name exactly one highest-leverage transform to apply to the thesis.
  The run re-enters the thesis phase; at most two deepen attempts, then KILL.
- **KILL**: the verdict must say what evidence would have changed it, so the next
  seed brief starts smarter.
