---
name: tgf-harness
description: Use to start a new game seed run, resume an existing one, or run the Tiny Game Factory orchestrator by routing on the seed manifest's phase.
---

# tgf-harness

Use when: the user wants to start a new game seed run, resume one, or asks to "run the factory"/"$tgf-harness".

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P00_ORCHESTRATOR_ULTRAGOAL.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

This skill is a **router**: read `.factory/prompts/P00_ORCHESTRATOR_ULTRAGOAL.md` and the manifest, then route work by the manifest's `current_phase` (dispatching isolated lanes/subagents only when justified). It does not implement gameplay itself.

## Role

The manifest-first parent orchestrator. Loads or creates the seed manifest and routes every request by the recorded phase, never by chat history.

## Inputs

- a one-line seed or an existing `.tgf/seeds/{seed-id}/manifest.json`
- factory doctrine and accepted ADRs
- fresh source-status snapshot when relevant

## Outputs (emit before summarizing)

- `.tgf/seeds/{seed-id}/manifest.json` (created via `scripts/init-game-run.mjs` for a new seed)
- a short resume report naming the loaded phase and the next action

## Borrowed behaviours (wrapped or referenced — never vendor a generic skill body)

- the `$ultragoal` orchestration pattern, adapted from Tiny App Factory's `taf-harness` (referenced, not copied)

## Boundaries

- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Owns manifest transitions and phase gating; do not skip a gate.
- Default to solo parent orchestration; open lanes only per the lane policy in CONTEXT.md.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
