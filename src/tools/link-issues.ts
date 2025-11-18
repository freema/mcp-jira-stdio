import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { LinkIssuesInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { linkIssues } from '../utils/api-helpers.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:link-issues');

export const linkIssuesTool: Tool = {
  name: TOOL_NAMES.LINK_ISSUES,
  description:
    'Creates a link between two Jira issues with a specified relationship type. Common link types include "Blocks", "Relates", "Duplicates", "Clones". Optionally adds a comment to the link.',
  inputSchema: {
    type: 'object',
    properties: {
      inwardIssueKey: {
        type: 'string',
        description: 'Issue key to link from (e.g., PROJECT-123)',
      },
      outwardIssueKey: {
        type: 'string',
        description: 'Issue key to link to (e.g., PROJECT-456)',
      },
      linkType: {
        type: 'string',
        description:
          'Type of link relationship (e.g., "Blocks", "Relates", "Duplicates", "Clones")',
      },
      comment: {
        type: 'string',
        description: 'Optional comment to add when creating the link',
      },
    },
    required: ['inwardIssueKey', 'outwardIssueKey', 'linkType'],
  },
};

export async function handleLinkIssues(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(LinkIssuesInputSchema, input);

    log.info(
      `Linking ${validated.inwardIssueKey} to ${validated.outwardIssueKey} with type "${validated.linkType}"...`
    );

    await linkIssues(
      validated.inwardIssueKey,
      validated.outwardIssueKey,
      validated.linkType,
      validated.comment
    );

    log.info(`Successfully linked ${validated.inwardIssueKey} to ${validated.outwardIssueKey}`);

    const message = validated.comment
      ? `Successfully linked ${validated.inwardIssueKey} to ${validated.outwardIssueKey} (${validated.linkType}) with comment`
      : `Successfully linked ${validated.inwardIssueKey} to ${validated.outwardIssueKey} (${validated.linkType})`;

    return formatSuccessResponse(message);
  } catch (error) {
    log.error('Error in handleLinkIssues:', error);
    return handleError(error);
  }
}
