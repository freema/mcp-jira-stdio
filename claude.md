## Contributor Guide for Claude

This document has been consolidated into AGENTS.md (the single source of truth).

- How to add a tool, validate input, and register handlers: see `AGENTS.md` → “Adding a Tool”.
- Coding style, testing, and developer commands: see `AGENTS.md`.
- Agent-specific guidance and list of agents: see `AGENTS.md` → “Agent Instructions”.

Quick Start:

1. Create `src/tools/<name>.ts` with a `Tool` export and a handler.
2. Add a Zod schema in `src/types/tools.ts` and use `validateInput(...)`.
3. Export from `src/tools/index.ts` and use `TOOL_NAMES`.
4. Run `task check` and `task test`.
