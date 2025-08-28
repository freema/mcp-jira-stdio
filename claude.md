## Add Tool
1. Create `src/tools/[name].ts`
2. Add handler + validator
3. Export in `src/tools/index.ts`
4. Register in `src/index.ts`

## Structure
- Each tool = separate file
- Validators use zod
- Always return ToolResponse
- Handle errors consistently

## MANDATORY AGENT USAGE
For EVERY message, you MUST:
1. Check agent triggers
2. Delegate to correct agent
3. NEVER handle specialized tasks directly

## Available Agents
- jira-api-integrator: Jira API work
- mcp-maintainer: Code cleanup
- mcp-tool-developer: Tool creation
- test-writer: Test writer agent