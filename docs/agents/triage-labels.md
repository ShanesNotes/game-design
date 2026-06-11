# Triage labels — canonical vocabulary

The canonical label set for the factory's **local** tracker (issues live as
markdown under `.tgf/issues/` — or `.scratch/` for pre-triage notes — never a remote
host by default, per `issue-tracker.md` and ADR 0004; per-seed run state under
`.tgf/seeds/{seed-id}/` is evidence, not issues). The borrowed `triage` and
`to-issues` skills read this file as their label authority.

**HARD RULE: these five labels are the entire vocabulary. Do not invent, alias, or
extend it.** A need that no label covers is a signal to sharpen the issue, not to
add a label.

## The label set

| Label | One-line meaning |
|---|---|
| `needs-triage` | Untriaged. Default on creation; no human or agent owns it yet. |
| `needs-info` | Blocked on missing evidence/answer; cannot proceed until supplied. |
| `ready-for-agent` | Scoped enough for an AFK agent to grab and execute unattended. |
| `ready-for-human` | Needs human judgement (taste, direction, a verdict) before it moves. |
| `wontfix` | Acknowledged and deliberately declined; closed without action. |

## Factory readiness notes (phase model — see CONTEXT.md)

Readiness is **evidence-gated**, not vibe-gated. "Completion is evidence, not prose."

- **A decompose/slice issue is `ready-for-agent` only when the thesis is
  design-locked and the engine decision exists** — i.e. `GAME_THESIS.md` is
  written, a gate-passing depth vector sits in `reviews/`, and
  `decisions/0001-engine-profile.md` is accepted (ADR 0002: no default engine
  before the thesis; ADR 0006: no slicing before design-lock). Absent any of
  these, label `needs-info`.
- **A design-review-completion issue is `ready-for-human` only with the gate
  artifacts** — `reviews/ANTI_BORING_VERDICT.md` plus `reviews/depth-vector.json`
  (depth verdict `ADVANCE`/`DEEPEN`/`KILL`, vector ≥16/24 with nonzero
  Choice/Tradeoff/Pressure/Uncertainty/Mastery/Replayable). Without both artifacts
  it stays `needs-info`; the human is not asked to judge depth on prose. Playtest
  evidence is shipped-pack doctrine and lands downstream, not here.
- **Direction/taste questions are `ready-for-human`** — but at most one before the
  spec is decomposed, and never engine/art questions before `GAME_THESIS.md`.
- **A toolchain/setup issue is `ready-for-agent`** once it names a real probe to run
  (`tgf-verify-toolchain`); a verifier with no probe is `needs-info`.
- **A `DEEPEN` issue** carries exactly one named transform; if the transform is
  unnamed it is `needs-info`, not `ready-for-agent`.
- **`KILL` / `DISCARD_ALL` verdicts** map to `wontfix` (declined by evidence).

## State flow

```
created ──▶ needs-triage ──▶ needs-info ──▶ ready-for-agent ─┐
                  │              ▲   │                        ├─▶ done (evidence: validator/playtest/verdict)
                  │              │   └──▶ ready-for-human ─────┘
                  └──────────────┴───────────────────────────────▶ wontfix
```

Every issue enters as `needs-triage`. Triage routes it to exactly one of the other
four. `needs-info` and the two `ready-*` states cycle as evidence arrives or lapses.
Only `wontfix` and evidence-backed `done` are terminal.
