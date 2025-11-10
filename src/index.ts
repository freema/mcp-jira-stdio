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
  [TOOL_NAMES.GET_CREATE_META, tools.handleGetCreateMeta],
  [TOOL_NAMES.GET_CUSTOM_FIELDS, tools.handleGetCustomFields],
  [TOOL_NAMES.LIST_ISSUE_ATTACHMENTS, tools.handleListAttachments],
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
  tools.getCreateMetaTool,
  tools.getCustomFieldsTool,
  tools.listAttachmentsTool,
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

  // List resources (attachments discovered via tools)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    console.error('📋 Listing resources (attachments available via tools)');
    // Starting simple - return empty
    // Users will discover attachments via jira_get_issue or jira_list_issue_attachments tools
    // Future enhancement: List all attachments from recent issues
    return { resources: [] };
  });

  // Read resource (download attachment content)
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    console.error(`📥 Reading resource: ${uri}`);

    try {
      const { parseAttachmentUri, getAttachmentContent, getAttachmentMetadata, bufferToBase64 } =
        await import('./utils/attachment-helpers.js');

      // Parse URI
      const parsed = parseAttachmentUri(uri);
      if (!parsed) {
        throw new Error(`Invalid attachment URI: ${uri}`);
      }

      const { attachmentId, isThumbnail } = parsed;

      // Get metadata first (to know mimeType)
      const metadata = await getAttachmentMetadata(attachmentId);

      // Download content
      const buffer = await getAttachmentContent(attachmentId, isThumbnail);

      // Validate size (max 10MB for now)
      const maxSizeMB = parseInt(process.env.JIRA_MAX_ATTACHMENT_SIZE_MB || '10');
      const sizeMB = buffer.length / 1024 / 1024;
      if (sizeMB > maxSizeMB) {
        throw new Error(
          `Attachment too large: ${sizeMB.toFixed(2)}MB (max ${maxSizeMB}MB). Configure JIRA_MAX_ATTACHMENT_SIZE_MB to increase.`
        );
      }

      // Convert to base64
      const base64 = bufferToBase64(buffer);

      console.error(`✅ Resource ${uri} read successfully (${sizeMB.toFixed(2)}MB)`);

      return {
        contents: [
          {
            uri,
            mimeType: metadata.mimeType,
            blob: base64,
          },
        ],
      };
    } catch (error: any) {
      console.error(`❌ Error reading resource ${uri}:`, error.message);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to read attachment: ${errorMessage}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Jira MCP server running on stdio');
}

main().catch((error) => {
  log.error('Fatal error:', error);
  process.exit(1);
});
