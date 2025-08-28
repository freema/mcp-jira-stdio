import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { AddCommentInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { addComment } from '../utils/api-helpers.js';
import { formatCommentResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:add-comment');

export const addCommentTool: Tool = {
  name: TOOL_NAMES.ADD_COMMENT,
  description:
    'Adds a comment to an existing Jira issue. Supports visibility restrictions for groups or roles. Returns the created comment with author details and timestamp.',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key to add comment to (e.g., PROJECT-123)',
      },
      body: {
        type: 'string',
        description: 'Comment body text',
        minLength: 1,
      },
      visibility: {
        type: 'object',
        description: 'Comment visibility restrictions (optional)',
        properties: {
          type: {
            type: 'string',
            enum: ['group', 'role'],
            description: 'Visibility type - either "group" or "role"',
          },
          value: {
            type: 'string',
            description: 'Group name or role name for visibility restriction',
          },
        },
        required: ['type', 'value'],
      },
    },
    required: ['issueKey', 'body'],
  },
};

export async function handleAddComment(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(AddCommentInputSchema, input);

    log.info(`Adding comment to issue ${validated.issueKey}...`);

    const comment = await addComment(validated.issueKey, validated.body, validated.visibility);

    log.info(`Added comment to ${validated.issueKey}`);

    return formatCommentResponse(comment);
  } catch (error) {
    log.error('Error in handleAddComment:', error);
    return handleError(error);
  }
}
