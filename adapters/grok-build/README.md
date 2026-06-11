# Grok Build adapter

Status: **PROBE**. Optional **third builder surface** alongside Claude Code and
Codex — account-tier gated and not provisioned by default.

**The factory must NOT depend on this surface.** Every core step (thesis,
design review, decomposition, packaging) has to run with Grok Build absent.
Treat it strictly as an extra contributor whose output is judged like any other.

## Before use — local verification

Per `docs/toolchain-verification-ledger.md`, this surface is `PROBE`. Verify
locally before wiring it into `factory.config.toml`:

1. `grok-build --version` — confirms the binary exists for this account tier.
2. Headless `-p` invocation works (non-interactive prompt mode).
3. Git worktrees behave (isolated working copies when fanned out).
4. Any Arena-like scoring is reproducible locally — do not trust hosted scores.

## Selection rule

If used, judge its output by the **same paper falsifiers and validators** as any
other contributor — never code taste alone. "Arena Mode" / model self-judgment
is advisory at most; it never selects.
