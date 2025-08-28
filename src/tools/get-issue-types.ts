import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetIssueTypesInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getIssueTypes } from '../utils/api-helpers.js';
import { formatIssueTypesResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';

export const getIssueTypesTool: Tool = {
  name: TOOL_NAMES.GET_ISSUE_TYPES,
  description:
    'Retrieves available issue types. Can get global issue types or project-specific issue types including regular issues and subtasks (Bug, Story, Task, Epic, etc.).',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description:
          'Project key to get issue types for specific project (optional - if not provided, returns global issue types)',
      },
    },
    required: [],
  },
};

export async function handleGetIssueTypes(input: any): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetIssueTypesInputSchema, input);

    if (validated.projectKey) {
      console.error(`🔍 Getting issue types for project ${validated.projectKey}...`);
    } else {
      console.error(`🔍 Getting global issue types...`);
    }

    const issueTypes = await getIssueTypes(validated.projectKey);

    console.error(`✅ Found ${issueTypes.length} issue type(s)`);

    return formatIssueTypesResponse(issueTypes);
  } catch (error) {
    console.error('❌ Error in handleGetIssueTypes:', error);
    return handleError(error);
  }
}
