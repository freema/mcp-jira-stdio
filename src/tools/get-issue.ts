import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetIssueInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getIssue } from '../utils/api-helpers.js';
import { formatIssueResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-issue');

export const getIssueTool: Tool = {
  name: TOOL_NAMES.GET_ISSUE,
  description:
    'Retrieves detailed information about a specific Jira issue by its key (e.g., PROJECT-123). Returns comprehensive issue details including status, assignee, priority, comments, and custom fields.',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key (e.g., PROJECT-123)',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Additional issue details to include (e.g., ["comments", "attachments", "changelog"])',
        default: [],
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fields to retrieve (e.g., ["summary", "status", "assignee"])',
      },
    },
    required: ['issueKey'],
  },
};

export async function handleGetIssue(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetIssueInputSchema, input);

    log.info(`Getting issue ${validated.issueKey}...`);

    const getParams: any = {};

    if (validated.expand !== undefined) getParams.expand = validated.expand;
    if (validated.fields !== undefined) getParams.fields = validated.fields;

    const issue = await getIssue(validated.issueKey, getParams);

    log.info(`Retrieved issue ${issue.key}`);

    return formatIssueResponse(issue);
  } catch (error) {
    log.error('Error in handleGetIssue:', error);
    return handleError(error);
  }
}
