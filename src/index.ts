// Load .env file in non-production modes
if (process.env.NODE_ENV !== 'production') {
  try {
    const { config } = await import('dotenv');
    config();
    // Loaded .env silently; logging handled by logger
  } catch {
    // no-op; continue without .env
  }
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';

import { validateAuth } from './utils/jira-auth.js';
import { createLogger } from './utils/logger.js';
import { TOOL_NAMES } from './config/constants.js';

const log = createLogger('server');

// Import all tools
import * as tools from './tools/index.js';

// Tool handler mapping
const toolHandlers = new Map<string, (input: unknown) => Promise<any>>([
  [TOOL_NAMES.GET_VISIBLE_PROJECTS, tools.handleGetVisibleProjects],
  [TOOL_NAMES.GET_ISSUE, tools.handleGetIssue],
  [TOOL_NAMES.SEARCH_ISSUES, tools.handleSearchIssues],
  [TOOL_NAMES.GET_MY_ISSUES, tools.handleGetMyIssues],
  [TOOL_NAMES.GET_ISSUE_TYPES, tools.handleGetIssueTypes],
  [TOOL_NAMES.GET_USERS, tools.handleGetUsers],
  [TOOL_NAMES.GET_PRIORITIES, tools.handleGetPriorities],
  [TOOL_NAMES.GET_STATUSES, tools.handleGetStatuses],
  [TOOL_NAMES.CREATE_ISSUE, tools.handleCreateIssue],
  [TOOL_NAMES.UPDATE_ISSUE, tools.handleUpdateIssue],
  [TOOL_NAMES.ADD_COMMENT, tools.handleAddComment],
  [TOOL_NAMES.GET_PROJECT_INFO, tools.handleGetProjectInfo],
  [TOOL_NAMES.CREATE_SUBTASK, tools.handleCreateSubtask],
]);

// All available tools
const allTools = [
  tools.getVisibleProjectsTool,
  tools.getIssueTool,
  tools.searchIssuesTool,
  tools.getMyIssuesTool,
  tools.getIssueTypesTool,
  tools.getUsersTool,
  tools.getPrioritiesTool,
  tools.getStatusesTool,
  tools.createIssueTool,
  tools.updateIssueTool,
  tools.addCommentTool,
  tools.getProjectInfoTool,
  tools.createSubtaskTool,
];

async function main() {
  const isDryRun =
    (process.env.DRY_RUN || '').toLowerCase() === '1' ||
    (process.env.DRY_RUN || '').toLowerCase() === 'true';

  // Show auth info on startup when configured (skip in DRY_RUN)
  if (!isDryRun) {
    const hasAuthVars = Boolean(
      process.env.JIRA_BASE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN
    );

    if (hasAuthVars) {
      try {
        const auth = validateAuth();
        console.error(`🔐 Authenticated as: ${auth.email}`);
        console.error(`🌐 Jira instance: ${auth.baseUrl}`);
      } catch (error: any) {
        console.error('⚠️  Invalid Jira credentials:', error.message);
      }
    } else {
      console.error('⚠️  Jira env vars missing (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)');
    }
  } else {
    console.error('🧪 DRY_RUN=1 set — skipping Jira auth check');
  }

  // Read version from package.json
  let version = '0.0.0';
  try {
    const pkg = await import('../package.json', { assert: { type: 'json' } } as any);
    version = (pkg as any).default?.version || (pkg as any).version || version;
  } catch {
    // ignore
  }

  const server = new Server(
    {
      name: 'jira-mcp-server',
      version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error(`📋 Listing ${allTools.length} available tool(s)`);
    return { tools: allTools };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    console.error(`🛠️ Executing tool: ${name}`);

    const handler = toolHandlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await handler(args);
      console.error(`✅ Tool ${name} executed successfully`);
      return result;
    } catch (error: any) {
      console.error(`❌ Error executing tool ${name}:`, error.message);
      throw error;
    }
  });

  // List resources (not implemented for this server)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: [] };
  });

  // Read resource (not implemented for this server)
  server.setRequestHandler(ReadResourceRequestSchema, async () => {
    throw new Error('Resource reading not implemented');
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Jira MCP server running on stdio');
}

main().catch((error) => {
  log.error('Fatal error:', error);
  process.exit(1);
});
