import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { CreateIssueLinkInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { createIssueLink } from '../utils/api-helpers.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:create-issue-link');

export const createIssueLinkTool: Tool = {
  name: TOOL_NAMES.CREATE_ISSUE_LINK,
  description:
    'Creates a link between two Jira issues. Supports common link types like "blocks", "relates", "duplicates", and "clones". Use this to establish relationships between issues.',
  inputSchema: {
    type: 'object',
    properties: {
      fromIssue: {
        type: 'string',
        description: 'Source issue key (e.g., PROJECT-123)',
      },
      toIssue: {
        type: 'string',
        description: 'Target issue key (e.g., PROJECT-456)',
      },
      linkType: {
        type: 'string',
        description:
          'Link type: "blocks" (fromIssue blocks toIssue), "is blocked by", "relates", "duplicates", "clones", or custom link type name',
      },
    },
    required: ['fromIssue', 'toIssue', 'linkType'],
  },
};

export async function handleCreateIssueLink(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(CreateIssueLinkInputSchema, input);

    log.info(
      `Creating ${validated.linkType} link from ${validated.fromIssue} to ${validated.toIssue}...`
    );

    await createIssueLink(validated.fromIssue, validated.toIssue, validated.linkType);

    log.info('Issue link created successfully');

    return formatSuccessResponse(
      `Link created: ${validated.fromIssue} ${validated.linkType} ${validated.toIssue}`
    );
  } catch (error) {
    log.error('Error in handleCreateIssueLink:', error);
    return handleError(error);
  }
}
