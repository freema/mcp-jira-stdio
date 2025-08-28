import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetStatusesInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getStatuses } from '../utils/api-helpers.js';
import { formatStatusesResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-statuses');

export const getStatusesTool: Tool = {
  name: TOOL_NAMES.GET_STATUSES,
  description:
    'Retrieves available statuses (global or project-specific, e.g., To Do, In Progress, Done). Returns status categories and workflow information.',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: 'Project key to get statuses for specific project (optional)',
      },
      issueTypeId: {
        type: 'string',
        description: 'Issue type ID to get statuses for specific issue type (requires projectKey)',
      },
    },
    required: [],
  },
};

export async function handleGetStatuses(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetStatusesInputSchema, input);

    if (validated.projectKey && validated.issueTypeId) {
      log.info(
        `Getting statuses for project ${validated.projectKey} and issue type ${validated.issueTypeId}...`
      );
    } else if (validated.projectKey) {
      log.info(`Getting statuses for project ${validated.projectKey}...`);
    } else {
      log.info('Getting global statuses...');
    }

    const getParams: any = {};

    if (validated.projectKey !== undefined) getParams.projectKey = validated.projectKey;
    if (validated.issueTypeId !== undefined) getParams.issueTypeId = validated.issueTypeId;

    const statuses = await getStatuses(getParams);

    log.info(`Found ${statuses.length} status(es)`);

    return formatStatusesResponse(statuses);
  } catch (error) {
    log.error('Error in handleGetStatuses:', error);
    return handleError(error);
  }
}
