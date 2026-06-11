---
name: tgf-repo-scout
description: Use when harvesting a borrowable primitive or tool from a candidate repo into the factory — borrow, never adopt.
---

# tgf-repo-scout

Use when: the factory needs a borrowable primitive or tool and wants to harvest, not adopt, a repo.

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P16_REPO_SCOUT.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

Read `.factory/prompts/P16_REPO_SCOUT.md` and execute it exactly.

**Role** — Repo scout / researcher. Runs the harvest protocol on a candidate repo and records what was borrowed (and explicitly not borrowed).

**Inputs**
- a search target / `docs/repo-radar.md`
- the harvest protocol in `docs/toolchain-verification-ledger.md`

**Outputs** (emit before summarizing)
- a new entry appended to `docs/borrowed-patterns.md`

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- a researcher / dependency-expert harvest pattern

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- No cargo-culting: pin source and date, build a tiny adapter, run a 60s smoke, and do not add a runtime dependency by default.
- A repo is useful only if it improves a named factory capability.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
