import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { CreateSubtaskInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { createSubtask } from '../utils/api-helpers.js';
import { formatIssueResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:create-subtask');

export const createSubtaskTool: Tool = {
  name: TOOL_NAMES.CREATE_SUBTASK,
  description:
    'Creates a subtask under an existing parent issue. Automatically determines the correct project and subtask issue type. Supports setting priority, assignee, labels, and components. Description format is controlled by the "format" parameter (default: markdown).',
  inputSchema: {
    type: 'object',
    properties: {
      parentIssueKey: {
        type: 'string',
        description: 'Parent issue key (e.g., PROJECT-123)',
      },
      summary: {
        type: 'string',
        description: 'Subtask summary/title',
        minLength: 1,
      },
      description: {
        type: 'string',
        description: 'Detailed subtask description (optional). Format depends on the "format" parameter.',
      },
      priority: {
        type: 'string',
        description: 'Subtask priority name (e.g., High, Medium, Low) - optional',
      },
      assignee: {
        type: 'string',
        description: 'Assignee account ID (optional)',
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Subtask labels (optional)',
        default: [],
      },
      components: {
        type: 'array',
        items: { type: 'string' },
        description: 'Component names (optional)',
        default: [],
      },
      format: {
        type: 'string',
        enum: ['markdown', 'adf', 'plain'],
        description:
          'Description format: "markdown" (converts Markdown to ADF, default), "adf" (use as-is ADF object), "plain" (converts plain text to ADF with basic formatting)',
        default: 'markdown',
      },
    },
    required: ['parentIssueKey', 'summary'],
  },
};

export async function handleCreateSubtask(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(CreateSubtaskInputSchema, input);

    log.info(`Creating subtask under parent issue ${validated.parentIssueKey}...`);

    const subtaskParams: any = {
      summary: validated.summary,
    };

    if (validated.description !== undefined) subtaskParams.description = validated.description;
    if (validated.priority !== undefined) subtaskParams.priority = validated.priority;
    if (validated.assignee !== undefined) subtaskParams.assignee = validated.assignee;
    if (validated.labels !== undefined) subtaskParams.labels = validated.labels;
    if (validated.components !== undefined) subtaskParams.components = validated.components;
    if (validated.format !== undefined) subtaskParams.format = validated.format;

    const subtask = await createSubtask(validated.parentIssueKey, subtaskParams);

    log.info(`Created subtask ${subtask.key}`);

    return formatIssueResponse(subtask);
  } catch (error) {
    log.error('Error in handleCreateSubtask:', error);
    return handleError(error);
  }
}
