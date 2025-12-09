import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetCommentsInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getComments } from '../utils/api-helpers.js';
import { formatCommentsResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-comments');

export const getCommentsTool: Tool = {
  name: TOOL_NAMES.GET_COMMENTS,
  description:
    'Retrieves all comments for a Jira issue. Returns comment author, content, timestamps, and visibility settings. Supports pagination for issues with many comments.',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key to get comments for (e.g., PROJECT-123)',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of comments to return (default: 50, max: 100)',
        minimum: 1,
        maximum: 100,
      },
      orderBy: {
        type: 'string',
        enum: ['created', '-created', '+created'],
        description:
          'Sort order for comments: "created" or "+created" (oldest first), "-created" (newest first)',
      },
      startAt: {
        type: 'number',
        description: 'Index of first comment to return (for pagination, default: 0)',
        minimum: 0,
      },
    },
    required: ['issueKey'],
  },
};

export async function handleGetComments(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetCommentsInputSchema, input);

    log.info(`Getting comments for issue ${validated.issueKey}...`);

    const options: {
      maxResults?: number;
      orderBy?: string;
      startAt?: number;
    } = {};

    if (validated.maxResults !== undefined) {
      options.maxResults = validated.maxResults;
    }

    if (validated.orderBy !== undefined) {
      options.orderBy = validated.orderBy;
    }

    if (validated.startAt !== undefined) {
      options.startAt = validated.startAt;
    }

    const comments = await getComments(validated.issueKey, options);

    log.info(`Retrieved ${comments.comments.length} comment(s) for ${validated.issueKey}`);

    return formatCommentsResponse(comments, validated.issueKey);
  } catch (error) {
    log.error('Error in handleGetComments:', error);
    return handleError(error);
  }
}
