import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetUsersInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getUsers } from '../utils/api-helpers.js';
import { formatUsersResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-users');

export const getUsersTool: Tool = {
  name: TOOL_NAMES.GET_USERS,
  description:
    'Search for users by name, email, username, or account ID. Returns display name, email, account status, and account type. Supports pagination.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for user name or email (partial matches supported)',
      },
      username: {
        type: 'string',
        description: 'Specific username to search for',
      },
      accountId: {
        type: 'string',
        description: 'Specific account ID to search for',
      },
      startAt: {
        type: 'number',
        description: 'Index of first result to return (for pagination)',
        minimum: 0,
        default: 0,
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return',
        minimum: 1,
        maximum: 50,
        default: 50,
      },
    },
    required: [],
  },
};

export async function handleGetUsers(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetUsersInputSchema, input);

    if (validated.query) {
      log.info(`Searching users with query: "${validated.query}"...`);
    } else if (validated.username) {
      log.info(`Searching for username: "${validated.username}"...`);
    } else if (validated.accountId) {
      log.info(`Searching for account ID: "${validated.accountId}"...`);
    } else {
      log.info('Getting all users...');
    }

    const getParams: any = {};

    if (validated.query !== undefined) getParams.query = validated.query;
    if (validated.username !== undefined) getParams.username = validated.username;
    if (validated.accountId !== undefined) getParams.accountId = validated.accountId;
    if (validated.startAt !== undefined) getParams.startAt = validated.startAt;
    if (validated.maxResults !== undefined) getParams.maxResults = validated.maxResults;

    const users = await getUsers(getParams);

    log.info(`Found ${users.length} user(s)`);

    return formatUsersResponse(users);
  } catch (error) {
    log.error('Error in handleGetUsers:', error);
    return handleError(error);
  }
}
