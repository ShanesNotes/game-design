# Claude Code adapter

A thin binding of the Tiny Game Factory to the Claude Code harness. It adds no
doctrine — it only maps factory contracts onto Claude Code's primitives.

**`.codex/skills/` is the source of truth for skills.** The TGF phase wrappers
(`tgf-*`) live there and define behavior. This folder does not redefine them.

## What lives here

- `agents/` — specialist subagent role briefs for Claude Code: `depth-redteam`,
  `engine-selector`, `repo-scout`. Each is a one-line mandate, not a
  reimplementation of a skill. (Build-only agent briefs were deleted per ADR 0006.)

## Orchestration substrate (soft)

`CLAUDE.md`, skills, subagents, hooks, and MCP are the orchestration layer. They
shape how an agent routes through phases, but they do not enforce the gates.

## Hard guards

`hooks/` (at the repo root) are the hard guards — the 3 entries in
`factory.config.toml` `[hooks]`. The 8 `[spec_pack.guards]` ship inside every
exported spec pack and fire downstream (see `docs/hooks-and-guards.md`). A guard
blocks; an agent cannot talk past it.

## MCP

MCP is for exploration and capture only — never for advancing a phase or writing
authoritative state. The manifest beats memory; MCP does not beat the manifest.
