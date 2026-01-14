import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { GetAttachmentsInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { getAttachments } from '../utils/api-helpers.js';
import { formatAttachmentsListResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:get-attachments');

export const getAttachmentsTool: Tool = {
  name: TOOL_NAMES.GET_ATTACHMENTS,
  description:
    'Lists all attachments on a Jira issue. Returns attachment metadata including filename, size, MIME type, author, and download URL.',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key to get attachments for (e.g., PROJECT-123)',
      },
    },
    required: ['issueKey'],
  },
};

export async function handleGetAttachments(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(GetAttachmentsInputSchema, input);

    log.info(`Getting attachments for issue ${validated.issueKey}...`);

    const attachments = await getAttachments(validated.issueKey);

    log.info(`Found ${attachments.length} attachment(s) for ${validated.issueKey}`);

    return formatAttachmentsListResponse(attachments, validated.issueKey);
  } catch (error) {
    log.error('Error in handleGetAttachments:', error);
    return handleError(error);
  }
}
