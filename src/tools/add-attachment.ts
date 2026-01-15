import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { AddAttachmentInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { addAttachment, addAttachmentFromUrl } from '../utils/api-helpers.js';
import { formatAttachmentResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES, ATTACHMENT_CONFIG } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:add-attachment');

export const addAttachmentTool: Tool = {
  name: TOOL_NAMES.ADD_ATTACHMENT,
  description: `Uploads an attachment (image, document, etc.) to a Jira issue.

**EFFICIENT METHOD (recommended for large files):**
- fileUrl: Provide URL to remote file - MINIMAL tokens (~60 tokens)
  Example: Upload to Dropbox/S3/imgur first, then provide URL

**DIRECT METHOD (for small files):**
- content: Base64 encoded content - WARNING: HIGH token cost (~330,000 tokens for 1MB file)
  Only suitable for small files (< 500 KB)

Returns attachment metadata including ID and download URL. To reference the image in a comment or description, use wiki markup: !filename.png! or !filename.png|thumbnail!`,
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
      fileUrl: {
        type: 'string',
        description:
          'URL to download file from (efficient for remote files, ~60 tokens). Upload large files to Dropbox/S3/imgur first, then use URL.',
        format: 'uri',
      },
      content: {
        type: 'string',
        description:
          'Base64-encoded or plain text content. WARNING: HIGH token cost (~330k tokens for 1MB file). Use fileUrl for large files or upload to cloud storage first.',
      },
      isBase64: {
        type: 'boolean',
        description:
          'Whether content is base64-encoded (default: true). Set to false for plain text files.',
        default: true,
      },
    },
    required: ['issueKey', 'filename'],
  },
};

export async function handleAddAttachment(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(AddAttachmentInputSchema, input);
    const { issueKey, filename, fileUrl, content, isBase64 } = validated;

    log.info(`Adding attachment "${filename}" to issue ${issueKey}...`);

    let attachments;

    // Dispatch based on input method
    if (fileUrl) {
      log.info('Using URL method (efficient - ~60 tokens)');
      attachments = await addAttachmentFromUrl(issueKey, fileUrl, filename);
    } else if (content) {
      // Warn about large base64 content (high token cost)
      if (content.length > ATTACHMENT_CONFIG.MAX_BASE64_SIZE) {
        log.warn(
          `Large base64 content detected (${content.length} chars = ~${Math.round(content.length / 4)} tokens). Consider uploading to cloud storage and using fileUrl instead.`
        );
      }
      log.info('Using base64 content method (HIGH token cost for large files)');
      attachments = await addAttachment(issueKey, filename, content, isBase64);
    } else {
      throw new Error('No file source provided (fileUrl or content required)');
    }

    if (!attachments || attachments.length === 0) {
      throw new Error('Failed to upload attachment - no attachment returned from Jira');
    }

    log.info(`Added attachment "${filename}" to ${issueKey}`);

    return formatAttachmentResponse(attachments[0]!, issueKey);
  } catch (error) {
    log.error('Error in handleAddAttachment:', error);
    return handleError(error);
  }
}
