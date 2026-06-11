---
name: tgf-existing-project-rescue
description: Use when an inherited game repo is being weighed as a seed and needs a read-only map, snapshot, and anti-boring rescue verdict.
---

# tgf-existing-project-rescue

Use when: an inherited game repo is being considered as a seed.

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P13_EXISTING_PROJECT_RESCUE.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

Read `.factory/prompts/P13_EXISTING_PROJECT_RESCUE.md` and execute it exactly.

**Role** — Existing-project rescue scout. Read-only first: maps the repo, captures a source snapshot, and renders an anti-boring rescue verdict (transform / fresh-prototype / replace).

**Inputs**
- the existing project path (read-only)
- a fresh source-status snapshot
- `docs/anti-boring-gate.md`

**Outputs** (emit before summarizing)
- a read-only rescue verdict artifact under the run state

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- `zoom-out` for the repo map; `diagnose` for failing toolchain/loops

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Existing projects are evidence, not destiny: do not mutate the inherited project without an explicit gate pass.
- The current engine is an option, not a constraint.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
