import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetIssueInputSchema } from '../types/tools.js';
import { validateInput, extractIssueKey } from '../utils/validators.js';
import { getIssue } from '../utils/api-helpers.js';
import { formatIssueResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-issue');

export const getIssueTool: Tool = {
  name: TOOL_NAMES.GET_ISSUE,
  description:
    'Retrieve details for a specific Jira issue by key or URL. Use this when the user mentions an issue like "PAYWALL-943" or pastes a Jira link (e.g., https://your.atlassian.net/browse/PAYWALL-943). Returns status, assignee, priority, project, type, labels, components, timestamps, and description.',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description:
          'Issue key or full Jira URL (e.g., PROJECT-123 or https://your.atlassian.net/browse/PROJECT-123)',
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

    // Accept either an issue key or a full Jira URL and extract the key
    const trimmedInput = (validated.issueKey || '').trim();
    const key = extractIssueKey(trimmedInput) || trimmedInput;

    log.info(`Getting issue ${key}...`);

    const getParams: any = {};

    if (validated.expand !== undefined) getParams.expand = validated.expand;
    if (validated.fields !== undefined) getParams.fields = validated.fields;

    const issue = await getIssue(key, getParams);

    log.info(`Retrieved issue ${issue.key}`);

    return formatIssueResponse(issue);
  } catch (error) {
    log.error('Error in handleGetIssue:', error);
    return handleError(error);
  }
}
