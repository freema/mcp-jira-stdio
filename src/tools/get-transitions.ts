import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetTransitionsInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getTransitions } from '../utils/api-helpers.js';
import { formatTransitionsResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-transitions');

export const getTransitionsTool: Tool = {
  name: TOOL_NAMES.GET_TRANSITIONS,
  description:
    'Retrieves all available workflow transitions for a Jira issue. Use this to discover which status changes are possible for an issue before calling jira_transition_issue.',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key to get available transitions for (e.g., PROJECT-123)',
      },
    },
    required: ['issueKey'],
  },
};

export async function handleGetTransitions(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetTransitionsInputSchema, input);

    log.info(`Getting transitions for issue ${validated.issueKey}...`);

    const transitions = await getTransitions(validated.issueKey);

    log.info(`Found ${transitions.length} transition(s) for ${validated.issueKey}`);

    return formatTransitionsResponse(transitions, validated.issueKey);
  } catch (error) {
    log.error('Error in handleGetTransitions:', error);
    return handleError(error);
  }
}
