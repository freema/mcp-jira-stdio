import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { SearchIssuesInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { searchIssues } from '../utils/api-helpers.js';
import { formatSearchResultsResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:search-issues');

export const searchIssuesTool: Tool = {
  name: TOOL_NAMES.SEARCH_ISSUES,
  description:
    'Search for Jira issues using JQL. Supports complex queries with pagination and field selection. Examples: "project = PROJECT AND status = Open", "assignee = currentUser()".',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL query string (e.g., "project = PROJECT AND status = Open")',
      },
      startAt: {
        type: 'number',
        description: 'Index of first result to return (for pagination)',
        minimum: 0,
        default: 0,
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return',
        minimum: 1,
        maximum: 100,
        default: 50,
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fields to retrieve for each issue',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional details to include for each issue',
        default: [],
      },
    },
    required: ['jql'],
  },
};

export async function handleSearchIssues(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(SearchIssuesInputSchema, input);

    log.info(`Searching issues with JQL: "${validated.jql}"...`);

    const searchParams: any = {
      jql: validated.jql,
    };

    if (validated.startAt !== undefined) searchParams.startAt = validated.startAt;
    if (validated.maxResults !== undefined) searchParams.maxResults = validated.maxResults;
    if (validated.fields !== undefined) searchParams.fields = validated.fields;
    if (validated.expand !== undefined) searchParams.expand = validated.expand;

    const result = await searchIssues(searchParams);

    log.info(`Found ${result.total} issue(s), showing ${result.issues.length}`);

    return formatSearchResultsResponse(result);
  } catch (error) {
    log.error('Error in handleSearchIssues:', error);
    return handleError(error);
  }
}
