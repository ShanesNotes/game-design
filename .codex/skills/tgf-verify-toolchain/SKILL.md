---
name: tgf-verify-toolchain
description: Probe and record local tool availability when a run starts on a new machine, weighs a new engine, or hits an unverified tool claim.
---

# tgf-verify-toolchain

Use when: a run starts on a new machine, considers a new engine, or hits an unverified tool claim.

Read first: `AGENTS.md`, `CONTEXT.md`, `docs/doctrine.md`, `.factory/prompts/P17_VERIFY_TOOLCHAIN.md`, and the seed manifest `.tgf/seeds/{seed-id}/manifest.json` when present.

Read `.factory/prompts/P17_VERIFY_TOOLCHAIN.md` and execute it exactly.

**Role** — Toolchain verifier. Probes local tools with real commands and records availability; never promotes a capability from memory.

**Inputs**
- `factory.config.toml`
- live local command probes
- `docs/toolchain-verification-ledger.md`

**Outputs** (emit before summarizing)
- a refreshed generated block in `docs/toolchain-verification-ledger.md` (via `node scripts/verify-local-tools.mjs --write docs/toolchain-verification-ledger.md`)
- `.factory/local_tool_probe.json`

**Borrowed behaviours** (wrapped or referenced — never vendor a generic skill body)
- a dependency-expert probing pattern, used only to inform future engine/tool choices

**Boundaries**
- Obey `AGENTS.md`, `CONTEXT.md`, and `docs/doctrine.md`.
- Manifest beats memory: read and update `.tgf/seeds/{seed-id}/manifest.json`, and record the phase transition in that run's `execution-ledger.jsonl`.
- Memory is not proof: mark unavailable tools as unavailable/PROBE, not assumed.
- Grok Build and mutation-capable MCP servers stay optional until locally verified.
- Never create a spec pack folder from this skill, never copy `.tgf`/`.omx`/ledgers/skill docs into generated output, and never assume an unverified tool.
