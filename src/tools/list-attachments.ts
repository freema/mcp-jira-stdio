import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { validateInput } from '../utils/validators.js';
import { listIssueAttachments } from '../utils/attachment-helpers.js';
import { formatAttachmentsResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';
import { z } from 'zod';

const log = createLogger('tool:list-attachments');

const ListAttachmentsInputSchema = z.object({
  issueKey: z.string().min(1, 'Issue key is required'),
});

export const listAttachmentsTool: Tool = {
  name: TOOL_NAMES.LIST_ISSUE_ATTACHMENTS,
  description: `Lists all attachments for a Jira issue. Returns attachment metadata including:
- Filename and file size
- MIME type
- Created date and author
- Resource URI for downloading content (use with MCP Resources protocol)

Use this tool when you need to see what files are attached to an issue.
After listing, you can download specific attachments using their URI via the MCP Resources protocol.

Example URI format: jira://attachment/{attachmentId}
Example thumbnail URI: jira://attachment/{attachmentId}/thumbnail`,

  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Issue key (e.g., PROJECT-123)',
      },
    },
    required: ['issueKey'],
  },
};

export async function handleListAttachments(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(ListAttachmentsInputSchema, input);
    const { issueKey } = validated;

    log.info(`Listing attachments for issue: ${issueKey}`);

    const attachments = await listIssueAttachments(issueKey);

    log.info(`Found ${attachments.length} attachment(s) for ${issueKey}`);

    return formatAttachmentsResponse(attachments, issueKey);
  } catch (error) {
    log.error('Error in handleListAttachments:', error);
    return handleError(error);
  }
}
