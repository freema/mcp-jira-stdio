import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetMyIssuesInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getMyIssues } from '../utils/api-helpers.js';
import { formatSearchResultsResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-my-issues');

export const getMyIssuesTool: Tool = {
  name: TOOL_NAMES.GET_MY_ISSUES,
  description:
    'Retrieves issues assigned to current user, sorted by most recently updated first. Supports pagination and field selection.',
  inputSchema: {
    type: 'object',
    properties: {
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
        maximum: 100,
        default: 50,
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fields to retrieve for each issue',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional details to include for each issue',
        default: [],
      },
    },
    required: [],
  },
};

export async function handleGetMyIssues(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetMyIssuesInputSchema, input);

    log.info('Getting issues assigned to current user...');

    const getParams: any = {};

    if (validated.startAt !== undefined) getParams.startAt = validated.startAt;
    if (validated.maxResults !== undefined) getParams.maxResults = validated.maxResults;
    if (validated.fields !== undefined) getParams.fields = validated.fields;
    if (validated.expand !== undefined) getParams.expand = validated.expand;

    const result = await getMyIssues(getParams);

    log.info(`Found ${result.total} issue(s) assigned to you, showing ${result.issues.length}`);

    return formatSearchResultsResponse(result);
  } catch (error) {
    log.error('Error in handleGetMyIssues:', error);
    return handleError(error);
  }
}
