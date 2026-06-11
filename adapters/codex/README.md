# Codex adapter (thin mirror)

OpenAI Codex runs the Tiny Game Factory by reading the **root `AGENTS.md`** as its
operating procedure. This directory is a thin adapter note, not a second home for
logic.

## Source of truth

- Skills live in **`.codex/skills/`**. That is the single source of truth.
- Do **not** copy or paraphrase skill bodies here. This adapter points at them; it
  does not duplicate them. If a skill changes, edit it under `.codex/skills/`.

## Conventions for Codex

- **Read `AGENTS.md` first** (root), then follow its read path (`CONTEXT.md` →
  `docs/doctrine.md` → `docs/adr/` → `factory.config.toml` → the phase prompt).
- **Invoke TGF skills explicitly.** Name the skill you intend to run
  (`tgf-seed-compile`, `tgf-decompose`, …); Codex does not auto-select one.
- **Subagents must be explicitly requested.** No assumed silent parallelism — the
  parent runs solo (lanes were retired per ADR 0006) and only fans out for disjoint
  research/review work when asked, then integrates and owns verification.
- **Hooks in `hooks/` are the guards** — the 3 entries in `factory.config.toml`
  `[hooks]`; the 8 `[spec_pack.guards]` ship inside every exported spec pack (see
  `docs/hooks-and-guards.md`). They block unsafe actions; treat a blocked gate as
  a stop, not a warning. Do not remove a guard without an ADR.
