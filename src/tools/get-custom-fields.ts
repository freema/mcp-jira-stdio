import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetCustomFieldsInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getFields } from '../utils/api-helpers.js';
import { formatCustomFieldsResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-custom-fields');

export const getCustomFieldsTool: Tool = {
  name: TOOL_NAMES.GET_CUSTOM_FIELDS,
  description:
    'Retrieves all custom fields available in Jira. Shows custom field names, IDs (e.g., customfield_10071), and types. Useful for discovering what custom fields exist and their identifiers.',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: 'Project key to filter custom fields (optional)',
      },
    },
    required: [],
  },
};

export async function handleGetCustomFields(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetCustomFieldsInputSchema, input);

    const projectMsg = validated.projectKey ? ` for project ${validated.projectKey}` : '';
    log.info(`Getting custom fields${projectMsg}...`);

    const fields = await getFields();

    log.info(`Retrieved ${fields.filter((f) => f.custom).length} custom fields`);

    return formatCustomFieldsResponse(fields, validated.projectKey);
  } catch (error) {
    log.error('Error in handleGetCustomFields:', error);
    return handleError(error);
  }
}
