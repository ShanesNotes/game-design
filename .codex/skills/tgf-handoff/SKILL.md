---
name: tgf-handoff
description: Export the finished spec pack to its clean co-dev folder (the factory's terminal artifact) and record the handoff with evidence pointers.
---

# tgf-handoff

Use when: `manifest.current_phase` is `decompose` or `handoff` and the run validates — the spec is ready to leave the factory. Also use for a blocked/AFK continuation note (the repo-local handoff file).

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P19_PACKAGE_SPEC.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

Read `.factory/prompts/P19_PACKAGE_SPEC.md` and execute it exactly.

**Role** — Release engineer for the spec pack. Dry-runs the export, satisfies the leakage gate by redacting run artifacts (never by weakening the gate), exports, and records the handoff.

**Inputs**
- the manifest and `execution-ledger.jsonl`
- `SPEC.md`, rendered `issues/`, thesis, engine decision, review verdicts
- `templates/spec-pack/` via `scripts/package-spec.mjs` (seeds the pack's `MISSION.md`/`RESOURCES.md` learning workspace from the thesis)

**Outputs** (emit before summarizing)
- the exported spec pack folder (default: the run's `default_spec_pack_root`)
- ledger row `spec-pack-exported`; manifest `spec_pack_path`; run advanced toward `complete`
- `.tgf/seeds/{seed-id}/handoffs/{seed-id}.md` when a human/agent continuation note is needed

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- the upstream `handoff` pattern, adapted to repo-local paths instead of OS temp

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Redaction gate: no GStack/Pocock/OMX/Sandcastle names, no `.tgf` paths, no secrets in anything exported.
- Export only through `scripts/package-spec.mjs` — it is the only writer of the pack.
- Never copy `.tgf`/`.omx`/ledgers/skill docs into the pack, and never assume an unverified tool.
