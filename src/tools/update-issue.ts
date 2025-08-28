import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { UpdateIssueInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { updateIssue, getIssue } from '../utils/api-helpers.js';
import { formatIssueResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';

export const updateIssueTool: Tool = {
  name: TOOL_NAMES.UPDATE_ISSUE,
  description:
    'Updates an existing Jira issue by its key. Supports updating summary, description, priority, assignee, labels, and components. Only specified fields will be updated.',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key to update (e.g., PROJECT-123)',
      },
      summary: {
        type: 'string',
        description: 'New issue summary/title (optional)',
      },
      description: {
        type: 'string',
        description: 'New issue description (optional)',
      },
      priority: {
        type: 'string',
        description: 'New priority name (e.g., High, Medium, Low) - optional',
      },
      assignee: {
        type: 'string',
        description: 'New assignee account ID (optional, use null string to unassign)',
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'New labels array (replaces existing labels) - optional',
      },
      components: {
        type: 'array',
        items: { type: 'string' },
        description: 'New components array (replaces existing components) - optional',
      },
    },
    required: ['issueKey'],
  },
};

export async function handleUpdateIssue(input: any): Promise<McpToolResponse> {
  try {
    const validated = validateInput(UpdateIssueInputSchema, input);

    console.error(`🔍 Updating issue ${validated.issueKey}...`);

    const updateParams: any = {};

    if (validated.summary !== undefined) updateParams.summary = validated.summary;
    if (validated.description !== undefined) updateParams.description = validated.description;
    if (validated.priority !== undefined) updateParams.priority = validated.priority;
    if (validated.assignee !== undefined) updateParams.assignee = validated.assignee;
    if (validated.labels !== undefined) updateParams.labels = validated.labels;
    if (validated.components !== undefined) updateParams.components = validated.components;

    await updateIssue(validated.issueKey, updateParams);

    // Get the updated issue to return current state
    const updatedIssue = await getIssue(validated.issueKey);

    console.error(`✅ Updated issue ${updatedIssue.key}`);

    return formatIssueResponse(updatedIssue);
  } catch (error) {
    console.error('❌ Error in handleUpdateIssue:', error);
    return handleError(error);
  }
}
