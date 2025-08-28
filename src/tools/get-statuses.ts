import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetStatusesInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getStatuses } from '../utils/api-helpers.js';
import { formatStatusesResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';

export const getStatusesTool: Tool = {
  name: TOOL_NAMES.GET_STATUSES,
  description:
    'Retrieves available issue statuses and their transitions. Can get global statuses or project/issue-type specific statuses (e.g., To Do, In Progress, Done). Returns status categories and workflow information.',
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

export async function handleGetStatuses(input: any): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetStatusesInputSchema, input);

    if (validated.projectKey && validated.issueTypeId) {
      console.error(
        `🔍 Getting statuses for project ${validated.projectKey} and issue type ${validated.issueTypeId}...`
      );
    } else if (validated.projectKey) {
      console.error(`🔍 Getting statuses for project ${validated.projectKey}...`);
    } else {
      console.error(`🔍 Getting global statuses...`);
    }

    const getParams: any = {};

    if (validated.projectKey !== undefined) getParams.projectKey = validated.projectKey;
    if (validated.issueTypeId !== undefined) getParams.issueTypeId = validated.issueTypeId;

    const statuses = await getStatuses(getParams);

    console.error(`✅ Found ${statuses.length} status(es)`);

    return formatStatusesResponse(statuses);
  } catch (error) {
    console.error('❌ Error in handleGetStatuses:', error);
    return handleError(error);
  }
}
