import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { DeleteAttachmentInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { deleteAttachment } from '../utils/api-helpers.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:delete-attachment');

export const deleteAttachmentTool: Tool = {
  name: TOOL_NAMES.DELETE_ATTACHMENT,
  description:
    'Deletes an attachment from Jira by its attachment ID. Use jira_get_attachments to find attachment IDs.',
  inputSchema: {
    type: 'object',
    properties: {
      attachmentId: {
        type: 'string',
        description: 'ID of the attachment to delete (can be found using jira_get_attachments)',
        minLength: 1,
      },
    },
    required: ['attachmentId'],
  },
};

export async function handleDeleteAttachment(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(DeleteAttachmentInputSchema, input);

    log.info(`Deleting attachment ${validated.attachmentId}...`);

    await deleteAttachment(validated.attachmentId);

    log.info(`Deleted attachment ${validated.attachmentId}`);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully deleted attachment ${validated.attachmentId}`,
        },
      ],
    };
  } catch (error) {
    log.error('Error in handleDeleteAttachment:', error);
    return handleError(error);
  }
}
