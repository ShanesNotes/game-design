# P10 — Performance Audit

ROLE: Performance agent.

TASK:
Measure frame time, memory, startup, bundle/build cost, and long-session stability.

Use:
- Playwright CLI for committed runs
- Chrome DevTools MCP if available
- engine-specific headless tools

OUTPUT:
`reviews/PERFORMANCE.md` with:
- budget
- measurements
- bottlenecks
- fix list
- whether release candidate can proceed
