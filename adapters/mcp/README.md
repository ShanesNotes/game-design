# MCP Adapters

How MCP servers may participate in the factory. Default posture is conservative: prefer committed, diffable CLI artifacts over live tool state.

## Browser / playtest

- **Playwright CLI** — the default committed harness. All playtest runs that gate G1/G2 use the CLI so traces and reports land as text artifacts under `playtests/**`.
- **Playwright MCP** — exploration and script-generation only. Use it to author or debug a flow interactively, then commit the generated CLI script. MCP output is never the artifact of record.

## Performance

- **Chrome DevTools MCP** — perf profiling (frame time, memory, long-run) when available. Optional; degrade to Playwright CLI traces if absent.

## Editor / asset mutation (OFF by default)

- **Godot, Blender, Meshy** MCP servers are disabled by default. Enabling any of them is an opt-in, per-task decision.
- Any mutation through these servers MUST emit a diffable text artifact (scene diff, recipe, prompt/seed/model/version). This is the `mcp_mutation_must_emit_text` guard (`hooks/mcp_mutation_must_emit_text.mjs`, declared in `factory.config.toml`): pass a mutation's output paths and it blocks when the output is opaque with no diffable artifact alongside it.

If a server cannot produce a reviewable text diff, it does not get to mutate factory state.
