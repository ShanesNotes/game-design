# GAME_THESIS.md

Status: GENERATED_BY_P01
Date:

The fenced `json` block below is the canonical, machine-checkable thesis. It MUST
validate against `schemas/game-thesis.schema.json` — run
`node scripts/validate-artifacts.mjs --check thesis --seed-id <id>`. The prose
sections beneath it are the human view; keep the two in sync.

```json
{
  "seed": "TODO one-line seed",
  "pitch": "TODO one-sentence hook",
  "thesis": "TODO why the bare loop stays interesting under pressure",
  "player_fantasy": "TODO the fantasy the player gets to live",
  "genre_hypotheses": [{ "hypothesis": "TODO", "confidence": 0.5 }],
  "core_loop_candidates": [
    { "id": "loop-a", "verbs": "TODO, TODO", "stakes": "TODO", "cycle_length_s": 60 }
  ],
  "replayability_hypothesis": "TODO why a second session plays differently",
  "depth_mechanisms": ["TODO"],
  "risk_register": [{ "risk": "TODO", "kind": "fun", "severity": 2, "mitigation": "TODO" }],
  "engine_profile_candidates": [
    { "rank": 1, "profile": "TODO", "rationale": "TODO", "reversal_trigger": "TODO" }
  ],
  "first_playable_slice": {
    "scope": "TODO under 5 minutes, bot-testable",
    "excluded": ["content expansion", "high-fidelity art", "multiplayer backend", "accounts/auth"]
  },
  "bot_success_criteria": ["60s run without crash", "no stuck state", "random vs skilled bot spread measurable"],
  "taste_gates": ["G1: is the primitive loop worth replaying?"],
  "kill_conditions": ["fails anti-boring gate after two deepen attempts", "dominant move cannot be removed cheaply"]
}
```

## Seed

> TODO

## Pitch

TODO

## Thesis

TODO

## Player fantasy

TODO

## Genre hypotheses

| Hypothesis | Confidence | Why | Risks |
|---|---:|---|---|
| TODO | 0.0 | TODO | TODO |

## Core-loop candidates

| ID | Verbs | Stakes | Cycle length | Depth pre-score |
|---|---|---|---:|---:|
| loop-a | TODO | TODO | 60s | 0/24 |

## Replayability hypothesis

TODO

## Depth mechanisms

- TODO

## Risk register

| Risk | Kind | Severity | Mitigation |
|---|---|---:|---|
| TODO | fun | 1 | TODO |

## Engine/profile candidates

| Rank | Profile | Rationale | Reversal trigger |
|---:|---|---|---|
| 1 | TODO | TODO | TODO |

## First playable slice

Scope:
- TODO

Explicitly excluded:
- content expansion
- high-fidelity art
- multiplayer backend
- accounts/auth
- meta-progression unless core loop requires it

Bot success criteria:
- 60s run
- no crash
- no stuck state
- random vs skilled bot spread measurable

## Taste gates

- G1: Is the primitive loop worth playing again?
- G2: What art direction should rung-2+ execute?
- G3: Release candidate signoff

## Kill conditions

- Fails anti-boring gate after two deepen attempts.
- Bot cannot complete loop because of structural issues.
- Dominant move cannot be removed cheaply.
