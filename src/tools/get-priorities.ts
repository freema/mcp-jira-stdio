import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetPrioritiesInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getPriorities } from '../utils/api-helpers.js';
import { formatPrioritiesResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-priorities');

export const getPrioritiesTool: Tool = {
  name: TOOL_NAMES.GET_PRIORITIES,
  description:
    'Retrieves all available priority levels in Jira (e.g., Highest, High, Medium, Low, Lowest). Returns priority details including IDs, names, and descriptions.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function handleGetPriorities(input: unknown): Promise<McpToolResponse> {
  try {
    validateInput(GetPrioritiesInputSchema, input);

    log.info('Getting all priority levels...');

    const priorities = await getPriorities();

    log.info(`Found ${priorities.length} priority level(s)`);

    return formatPrioritiesResponse(priorities);
  } catch (error) {
    log.error('Error in handleGetPriorities:', error);
    return handleError(error);
  }
}
