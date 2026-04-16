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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { validateAuth } from './utils/jira-auth.js';
import { createLogger } from './utils/logger.js';
import { TOOL_NAMES } from './config/constants.js';
import { McpToolResponse } from './types/common.js';

const log = createLogger('server');

// Import all tool handlers
import * as tools from './tools/index.js';

// Import all Zod schemas
import {
  GetVisibleProjectsInputSchema,
  GetIssueInputSchema,
  SearchIssuesInputSchema,
  GetMyIssuesInputSchema,
  GetIssueTypesInputSchema,
  GetUsersInputSchema,
  GetPrioritiesInputSchema,
  GetStatusesInputSchema,
  CreateIssueInputSchema,
  UpdateIssueInputSchema,
  AddCommentInputSchema,
  GetProjectInfoInputSchema,
  CreateSubtaskInputSchema,
  GetCreateMetaInputSchema,
  GetCustomFieldsInputSchema,
  CreateIssueLinkInputSchema,
  GetCommentsInputSchema,
  AddAttachmentInputSchema,
  GetAttachmentsInputSchema,
  DeleteAttachmentInputSchema,
  GetTransitionsInputSchema,
  TransitionIssueInputSchema,
  GetIssueGraphInputSchema,
} from './types/tools.js';

import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

// Tool registry entry
interface ToolEntry {
  name: string;
  description: string;
  inputSchema: any;
  handler: (input: unknown) => Promise<McpToolResponse>;
  annotations: ToolAnnotations;
}

// Centralized tool registry with annotations
const toolRegistry: ToolEntry[] = [
  // === Read-only tools ===
  {
    name: TOOL_NAMES.GET_VISIBLE_PROJECTS,
    description: tools.getVisibleProjectsTool.description!,
    inputSchema: GetVisibleProjectsInputSchema,
    handler: tools.handleGetVisibleProjects,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_ISSUE,
    description: tools.getIssueTool.description!,
    inputSchema: GetIssueInputSchema,
    handler: tools.handleGetIssue,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.SEARCH_ISSUES,
    description: tools.searchIssuesTool.description!,
    inputSchema: SearchIssuesInputSchema,
    handler: tools.handleSearchIssues,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_MY_ISSUES,
    description: tools.getMyIssuesTool.description!,
    inputSchema: GetMyIssuesInputSchema,
    handler: tools.handleGetMyIssues,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_ISSUE_TYPES,
    description: tools.getIssueTypesTool.description!,
    inputSchema: GetIssueTypesInputSchema,
    handler: tools.handleGetIssueTypes,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_USERS,
    description: tools.getUsersTool.description!,
    inputSchema: GetUsersInputSchema,
    handler: tools.handleGetUsers,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_PRIORITIES,
    description: tools.getPrioritiesTool.description!,
    inputSchema: GetPrioritiesInputSchema,
    handler: tools.handleGetPriorities,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_STATUSES,
    description: tools.getStatusesTool.description!,
    inputSchema: GetStatusesInputSchema,
    handler: tools.handleGetStatuses,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_PROJECT_INFO,
    description: tools.getProjectInfoTool.description!,
    inputSchema: GetProjectInfoInputSchema,
    handler: tools.handleGetProjectInfo,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_CREATE_META,
    description: tools.getCreateMetaTool.description!,
    inputSchema: GetCreateMetaInputSchema,
    handler: tools.handleGetCreateMeta,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_CUSTOM_FIELDS,
    description: tools.getCustomFieldsTool.description!,
    inputSchema: GetCustomFieldsInputSchema,
    handler: tools.handleGetCustomFields,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_COMMENTS,
    description: tools.getCommentsTool.description!,
    inputSchema: GetCommentsInputSchema,
    handler: tools.handleGetComments,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_ATTACHMENTS,
    description: tools.getAttachmentsTool.description!,
    inputSchema: GetAttachmentsInputSchema,
    handler: tools.handleGetAttachments,
    annotations: { readOnlyHint: true },
  },
  {
    name: TOOL_NAMES.GET_TRANSITIONS,
    description: tools.getTransitionsTool.description!,
    inputSchema: GetTransitionsInputSchema,
    handler: tools.handleGetTransitions,
    annotations: { readOnlyHint: true },
  },

  // === Mutating tools ===
  {
    name: TOOL_NAMES.CREATE_ISSUE,
    description: tools.createIssueTool.description!,
    inputSchema: CreateIssueInputSchema,
    handler: tools.handleCreateIssue,
    annotations: { readOnlyHint: false },
  },
  {
    name: TOOL_NAMES.UPDATE_ISSUE,
    description: tools.updateIssueTool.description!,
    inputSchema: UpdateIssueInputSchema,
    handler: tools.handleUpdateIssue,
    annotations: { readOnlyHint: false },
  },
  {
    name: TOOL_NAMES.ADD_COMMENT,
    description: tools.addCommentTool.description!,
    inputSchema: AddCommentInputSchema,
    handler: tools.handleAddComment,
    annotations: { readOnlyHint: false },
  },
  {
    name: TOOL_NAMES.CREATE_SUBTASK,
    description: tools.createSubtaskTool.description!,
    inputSchema: CreateSubtaskInputSchema,
    handler: tools.handleCreateSubtask,
    annotations: { readOnlyHint: false },
  },
  {
    name: TOOL_NAMES.CREATE_ISSUE_LINK,
    description: tools.createIssueLinkTool.description!,
    inputSchema: CreateIssueLinkInputSchema,
    handler: tools.handleCreateIssueLink,
    annotations: { readOnlyHint: false },
  },
  {
    name: TOOL_NAMES.ADD_ATTACHMENT,
    description: tools.addAttachmentTool.description!,
    inputSchema: AddAttachmentInputSchema,
    handler: tools.handleAddAttachment,
    annotations: { readOnlyHint: false },
  },
  {
    name: TOOL_NAMES.TRANSITION_ISSUE,
    description: tools.transitionIssueTool.description!,
    inputSchema: TransitionIssueInputSchema,
    handler: tools.handleTransitionIssue,
    annotations: { readOnlyHint: false },
  },

  {
    name: TOOL_NAMES.GET_ISSUE_GRAPH,
    description: tools.getIssueGraphTool.description!,
    inputSchema: GetIssueGraphInputSchema,
    handler: tools.handleGetIssueGraph,
    annotations: { readOnlyHint: true },
  },

  // === Destructive tools ===
  {
    name: TOOL_NAMES.DELETE_ATTACHMENT,
    description: tools.deleteAttachmentTool.description!,
    inputSchema: DeleteAttachmentInputSchema,
    handler: tools.handleDeleteAttachment,
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
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

  const server = new McpServer(
    {
      name: 'jira-mcp-server',
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools from the registry
  for (const entry of toolRegistry) {
    server.registerTool(
      entry.name,
      {
        description: entry.description,
        inputSchema: entry.inputSchema,
        annotations: entry.annotations,
      },
      async (args: any) => {
        console.error(`🛠️ Executing tool: ${entry.name}`);
        try {
          const result = await entry.handler(args);
          console.error(`✅ Tool ${entry.name} executed successfully`);
          return result;
        } catch (error: any) {
          console.error(`❌ Error executing tool ${entry.name}:`, error.message);
          throw error;
        }
      }
    );
  }

  console.error(`📋 Registered ${toolRegistry.length} tool(s)`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Jira MCP server running on stdio');
}

main().catch((error) => {
  log.error('Fatal error:', error);
  process.exit(1);
});
