// Load .env file in development mode
if (process.env.NODE_ENV !== 'production') {
  try {
    const { config } = await import('dotenv');
    const result = config();
    if (result.parsed && process.env.NODE_ENV === 'development') {
      console.error('[DEV] Loaded .env file');
    }
  } catch (error) {
    console.error('[DEV] Failed to load .env file:', error);
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

import { validateAuth, testConnection } from './utils/jira-auth.js';

// Import all tools
import * as tools from './tools/index.js';

// Tool handler mapping
const toolHandlers = new Map<string, (input: any) => Promise<any>>([
  ['jira_get_visible_projects', tools.handleGetVisibleProjects],
  ['jira_get_issue', tools.handleGetIssue],
  ['jira_search_issues', tools.handleSearchIssues],
  ['jira_get_my_issues', tools.handleGetMyIssues],
  ['jira_get_issue_types', tools.handleGetIssueTypes],
  ['jira_get_users', tools.handleGetUsers],
  ['jira_get_priorities', tools.handleGetPriorities],
  ['jira_get_statuses', tools.handleGetStatuses],
  ['jira_create_issue', tools.handleCreateIssue],
  ['jira_update_issue', tools.handleUpdateIssue],
  ['jira_add_comment', tools.handleAddComment],
  ['jira_get_project_info', tools.handleGetProjectInfo],
  ['jira_create_subtask', tools.handleCreateSubtask],
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
  // Validate authentication on startup
  try {
    const auth = validateAuth();
    
    // Only show detailed info and test connection in development mode
    if (process.env.NODE_ENV === 'development') {
      console.error(`[DEV] Authenticated as: ${auth.email}`);
      console.error(`[DEV] Jira instance: ${auth.baseUrl}`);
      
      // Test connection ONLY in development
      console.error('[DEV] Testing connection to Jira...');
      const connectionTest = await testConnection();
      if (connectionTest) {
        console.error('[DEV] Connection to Jira successful');
      } else {
        console.error('[DEV] Connection to Jira failed');
        process.exit(1);
      }
    }
  } catch (error: any) {
    console.error('Authentication Error:', error.message);
    process.exit(1);
  }

  const server = new Server(
    {
      name: 'jira-mcp-server',
      version: '1.0.0',
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
    if (process.env.NODE_ENV === 'development') {
      console.error(`[DEV] Listing ${allTools.length} available tool(s)`);
    }
    return {
      tools: allTools,
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    if (process.env.NODE_ENV === 'development') {
      console.error(`[DEV] Executing tool: ${name}`);
    }

    const handler = toolHandlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await handler(args);
      if (process.env.NODE_ENV === 'development') {
        console.error(`[DEV] Tool ${name} executed successfully`);
      }
      return result;
    } catch (error: any) {
      console.error(`Error executing tool ${name}:`, error.message);
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

  if (process.env.NODE_ENV === 'development') {
    console.error('[DEV] Jira MCP server running on stdio');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
