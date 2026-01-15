import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { AddAttachmentInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import {
  addAttachment,
  addAttachmentFromPath,
  addAttachmentFromUrl,
} from '../utils/api-helpers.js';
import { formatAttachmentResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES, ATTACHMENT_CONFIG } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:add-attachment');

export const addAttachmentTool: Tool = {
  name: TOOL_NAMES.ADD_ATTACHMENT,
  description: `Uploads an attachment (image, document, etc.) to a Jira issue.

**EFFICIENT METHODS (recommended):**
1. filePath: Provide local file path - MINIMAL tokens (~50 tokens)
2. fileUrl: Provide URL to remote file - MINIMAL tokens (~60 tokens)

**FALLBACK METHOD (high cost):**
3. content: Base64 encoded content - HIGH token cost (~330,000 tokens for 1MB file)

Use filePath or fileUrl whenever possible to save tokens. Returns attachment metadata including ID and download URL. To reference the image in a comment or description, use wiki markup: !filename.png! or !filename.png|thumbnail!`,
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
      filePath: {
        type: 'string',
        description: 'Absolute path to local file (most efficient, ~50 tokens vs 330k for base64)',
      },
      fileUrl: {
        type: 'string',
        description: 'URL to download file from (for remote files, ~60 tokens)',
        format: 'uri',
      },
      content: {
        type: 'string',
        description:
          'Base64-encoded or plain text content (fallback method, HIGH token cost ~330k for 1MB file)',
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
    const { issueKey, filename, filePath, fileUrl, content, isBase64 } = validated;

    log.info(`Adding attachment "${filename}" to issue ${issueKey}...`);

    let attachments;

    // Dispatch based on input method
    if (filePath) {
      log.info('Using file path method (most efficient, minimal tokens)');
      attachments = await addAttachmentFromPath(issueKey, filePath, filename);
    } else if (fileUrl) {
      log.info('Using URL method (efficient for remote files)');
      attachments = await addAttachmentFromUrl(issueKey, fileUrl, filename);
    } else if (content) {
      // Warn about large base64 content (high token cost)
      if (content.length > ATTACHMENT_CONFIG.MAX_BASE64_SIZE) {
        log.warn(
          `Large base64 content detected (${content.length} chars = ~${Math.round(content.length / 4)} tokens). Consider using filePath instead for better efficiency.`
        );
      }
      log.info('Using base64 content method (high token cost - consider filePath or fileUrl)');
      attachments = await addAttachment(issueKey, filename, content, isBase64);
    } else {
      throw new Error('No file source provided (filePath, fileUrl, or content required)');
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
