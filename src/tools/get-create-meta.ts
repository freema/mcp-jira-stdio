import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetCreateMetaInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getCreateMeta } from '../utils/api-helpers.js';
import { formatCreateMetaResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-create-meta');

export const getCreateMetaTool: Tool = {
  name: TOOL_NAMES.GET_CREATE_META,
  description:
    'Retrieves create metadata for a project, showing all available fields (including custom fields) for creating issues. Shows required vs optional fields, field types, and allowed values. Use this before creating issues to discover what fields are needed.',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: 'Project key to get create metadata for (e.g., PROJECT)',
      },
      issueTypeName: {
        type: 'string',
        description: 'Specific issue type name to get metadata for (optional)',
      },
    },
    required: ['projectKey'],
  },
};

export async function handleGetCreateMeta(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetCreateMetaInputSchema, input);

    log.info(`Getting create metadata for project ${validated.projectKey}...`);

    const options: any = {
      projectKeys: [validated.projectKey],
      expand: 'projects.issuetypes.fields',
    };

    if (validated.issueTypeName) {
      options.issueTypeNames = [validated.issueTypeName];
    }

    const meta = await getCreateMeta(options);

    log.info(`Retrieved create metadata for ${validated.projectKey}`);

    return formatCreateMetaResponse(meta);
  } catch (error) {
    log.error('Error in handleGetCreateMeta:', error);
    return handleError(error);
  }
}
