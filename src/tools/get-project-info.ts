import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetProjectInfoInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getProjectDetails } from '../utils/api-helpers.js';
import { formatProjectDetailsResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';

export const getProjectInfoTool: Tool = {
  name: TOOL_NAMES.GET_PROJECT_INFO,
  description:
    'Retrieves detailed information about a specific Jira project including components, versions, issue types, roles, and project insights. More comprehensive than the basic project list.',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: 'Project key to get detailed information for',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Additional project details to include (e.g., ["description", "lead", "issueTypes", "versions"])',
        default: [],
      },
    },
    required: ['projectKey'],
  },
};

export async function handleGetProjectInfo(input: any): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetProjectInfoInputSchema, input);

    console.error(`🔍 Getting detailed project information for ${validated.projectKey}...`);

    const project = await getProjectDetails(validated.projectKey, validated.expand);

    console.error(`✅ Retrieved project details for ${project.key}`);

    return formatProjectDetailsResponse(project);
  } catch (error) {
    console.error('❌ Error in handleGetProjectInfo:', error);
    return handleError(error);
  }
}
