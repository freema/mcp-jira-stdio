import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { AddAttachmentInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { addAttachment } from '../utils/api-helpers.js';
import { formatAttachmentResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:add-attachment');

export const addAttachmentTool: Tool = {
  name: TOOL_NAMES.ADD_ATTACHMENT,
  description:
    'Uploads an attachment (image, document, etc.) to a Jira issue. Accepts base64-encoded content or plain text. Returns attachment metadata including ID and download URL. To reference the image in a comment or description, use wiki markup: !filename.png! or !filename.png|thumbnail!',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key to add attachment to (e.g., PROJECT-123)',
      },
      filename: {
        type: 'string',
        description: 'Name of the file to attach (e.g., screenshot.png, document.pdf)',
        minLength: 1,
      },
      content: {
        type: 'string',
        description:
          'File content - base64-encoded for binary files (images, PDFs) or plain text for text files',
        minLength: 1,
      },
      isBase64: {
        type: 'boolean',
        description:
          'Whether content is base64-encoded (default: true). Set to false for plain text files.',
        default: true,
      },
    },
    required: ['issueKey', 'filename', 'content'],
  },
};

export async function handleAddAttachment(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(AddAttachmentInputSchema, input);

    log.info(`Adding attachment "${validated.filename}" to issue ${validated.issueKey}...`);

    const attachments = await addAttachment(
      validated.issueKey,
      validated.filename,
      validated.content,
      validated.isBase64
    );

    if (!attachments || attachments.length === 0) {
      throw new Error('Failed to upload attachment - no attachment returned from Jira');
    }

    log.info(`Added attachment "${validated.filename}" to ${validated.issueKey}`);

    return formatAttachmentResponse(attachments[0]!, validated.issueKey);
  } catch (error) {
    log.error('Error in handleAddAttachment:', error);
    return handleError(error);
  }
}
