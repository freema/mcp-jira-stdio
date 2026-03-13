import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { TransitionIssueInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { transitionIssue, getTransitions, getIssue } from '../utils/api-helpers.js';
import { formatIssueResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:transition-issue');

export const transitionIssueTool: Tool = {
  name: TOOL_NAMES.TRANSITION_ISSUE,
  description:
    'Transitions a Jira issue to a new workflow status (e.g., "To Do" -> "In Progress" -> "Done"). Use jira_get_transitions first to discover available transitions. Supports adding a comment and setting resolution during the transition.',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key to transition (e.g., PROJECT-123)',
      },
      transitionId: {
        type: 'string',
        description:
          'ID of the transition to perform. Use jira_get_transitions to find available transition IDs.',
      },
      transitionName: {
        type: 'string',
        description:
          'Name of the transition to perform (e.g., "In Progress", "Done"). Case-insensitive. Alternative to transitionId.',
      },
      comment: {
        type: 'string',
        description: 'Optional comment to add when transitioning the issue',
      },
      resolution: {
        type: 'string',
        description:
          'Resolution name when transitioning to a resolved/done status (e.g., "Done", "Fixed")',
      },
      format: {
        type: 'string',
        enum: ['markdown', 'adf', 'plain'],
        description:
          'Comment format: "markdown" (converts Markdown to ADF), "adf" (use as-is ADF object), "plain" (converts plain text to ADF with basic formatting). Default: "markdown"',
        default: 'markdown',
      },
    },
    required: ['issueKey'],
  },
};

export async function handleTransitionIssue(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(TransitionIssueInputSchema, input);

    let transitionId = validated.transitionId;

    // If transitionName is provided instead of transitionId, look it up
    if (!transitionId && validated.transitionName) {
      log.info(
        `Looking up transition "${validated.transitionName}" for issue ${validated.issueKey}...`
      );
      const transitions = await getTransitions(validated.issueKey);
      const match = transitions.find(
        (t) => t.name.toLowerCase() === validated.transitionName!.toLowerCase()
      );

      if (!match) {
        const available = transitions.map((t) => `"${t.name}" (ID: ${t.id})`).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `Transition "${validated.transitionName}" not found for issue ${validated.issueKey}.\n\nAvailable transitions: ${available || 'none'}`,
            },
          ],
        };
      }

      transitionId = match.id;
    }

    log.info(`Transitioning issue ${validated.issueKey} with transition ${transitionId}...`);

    const transitionOptions: { comment?: string; resolution?: string; format?: 'markdown' | 'adf' | 'plain' } = {};
    if (validated.comment) transitionOptions.comment = validated.comment;
    if (validated.resolution) transitionOptions.resolution = validated.resolution;
    if (validated.format) transitionOptions.format = validated.format;

    await transitionIssue(validated.issueKey, transitionId!, transitionOptions);

    // Get the updated issue to return current state
    const updatedIssue = await getIssue(validated.issueKey);

    log.info(
      `Transitioned issue ${validated.issueKey} to ${updatedIssue.fields.status.name}`
    );

    return formatIssueResponse(updatedIssue);
  } catch (error) {
    log.error('Error in handleTransitionIssue:', error);
    return handleError(error);
  }
}
