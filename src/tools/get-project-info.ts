import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetProjectInfoInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getProjectDetails } from '../utils/api-helpers.js';
import { formatProjectDetailsResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-project-info');

export const getProjectInfoTool: Tool = {
  name: TOOL_NAMES.GET_PROJECT_INFO,
  description:
    'Retrieves detailed information about a project (components, versions, issue types, roles, insights). More comprehensive than the basic project list.',
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

export async function handleGetProjectInfo(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetProjectInfoInputSchema, input);

    log.info(`Getting detailed project information for ${validated.projectKey}...`);

    const project = await getProjectDetails(validated.projectKey, validated.expand);

    log.info(`Retrieved project details for ${project.key}`);

    return formatProjectDetailsResponse(project);
  } catch (error) {
    log.error('Error in handleGetProjectInfo:', error);
    return handleError(error);
  }
}
