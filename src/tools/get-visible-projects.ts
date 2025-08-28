import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetVisibleProjectsInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getVisibleProjects } from '../utils/api-helpers.js';
import { formatProjectsResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-visible-projects');

export const getVisibleProjectsTool: Tool = {
  name: TOOL_NAMES.GET_VISIBLE_PROJECTS,
  description:
    'Retrieves all projects accessible to the authenticated user. Returns project keys, names, descriptions, and basic metadata.',
  inputSchema: {
    type: 'object',
    properties: {
      expand: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Additional project details to include (e.g., ["description", "lead", "issueTypes"])',
        default: [],
      },
      recent: {
        type: 'number',
        description: 'Limit results to recently accessed projects (max number)',
        minimum: 1,
        maximum: 100,
      },
    },
    required: [],
  },
};

export async function handleGetVisibleProjects(input: any): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetVisibleProjectsInputSchema, input);

    log.info('Getting visible projects...');

    const getParams: any = {};

    if (validated.expand !== undefined) getParams.expand = validated.expand;
    if (validated.recent !== undefined) getParams.recent = validated.recent;

    const projects = await getVisibleProjects(getParams);

    log.info(`Found ${projects.length} project(s)`);

    return formatProjectsResponse(projects);
  } catch (error) {
    log.error('Error in handleGetVisibleProjects:', error);
    return handleError(error);
  }
}
