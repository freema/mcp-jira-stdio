import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { SearchByEpicInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { searchIssues, getFields } from '../utils/api-helpers.js';
import { formatSearchResultsResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('tool:search-by-epic');

export const searchByEpicTool: Tool = {
  name: TOOL_NAMES.SEARCH_BY_EPIC,
  description:
    'Search for all issues linked to an Epic. Automatically finds the correct Epic Link custom field and builds the JQL query. This is easier than using jira_search_issues with manual JQL syntax like "cf[10014] = EPIC-123".',
  inputSchema: {
    type: 'object',
    properties: {
      epicKey: {
        type: 'string',
        description: 'Epic key to search for (e.g., MDE-799)',
      },
      includeSubtasks: {
        type: 'boolean',
        description: 'Include subtasks in results',
        default: false,
      },
      nextPageToken: {
        type: 'string',
        description:
          'Token for pagination. Omit for first page, use value from previous response for next page.',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return per page',
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
      orderBy: {
        type: 'string',
        enum: ['created', 'updated', 'priority', 'status', 'key'],
        description: 'Sort order for results',
        default: 'created',
      },
    },
    required: ['epicKey'],
  },
};

// Cache for Epic Link field ID to avoid repeated API calls
let cachedEpicLinkFieldId: string | null = null;

async function findEpicLinkFieldId(): Promise<string> {
  if (cachedEpicLinkFieldId) {
    log.info(`Using cached Epic Link field ID: ${cachedEpicLinkFieldId}`);
    return cachedEpicLinkFieldId;
  }

  log.info('Finding Epic Link custom field...');
  const fields = await getFields();

  // Try to find Epic Link field by various patterns
  const epicLinkField = fields.find((field) => {
    // Check if field name contains "epic link" (case insensitive)
    const nameMatch =
      field.name.toLowerCase().includes('epic link') ||
      field.name.toLowerCase().includes('parent link');

    // Check if custom field schema indicates it's an epic link
    const schemaMatch =
      field.schema?.custom?.toLowerCase().includes('epic') ||
      field.schema?.custom?.toLowerCase().includes('parent');

    return field.custom && (nameMatch || schemaMatch);
  });

  if (!epicLinkField) {
    log.error('Epic Link custom field not found in Jira instance');
    throw new Error(
      'Epic Link custom field not found in your Jira instance. ' +
        'This field is required for Epic-based searches. ' +
        'Please ensure your Jira instance has the Epic Link field enabled, ' +
        'or use jira_search_issues with a custom JQL query instead.'
    );
  }

  // Cache the field ID for future requests
  cachedEpicLinkFieldId = epicLinkField.id;
  log.info(`Found Epic Link field: ${epicLinkField.name} (${epicLinkField.id})`);

  return epicLinkField.id;
}

function buildJQL(
  epicKey: string,
  epicLinkFieldId: string,
  includeSubtasks: boolean,
  orderBy: string
): string {
  // Extract the numeric part from customfield_XXXXX
  const fieldIdMatch = epicLinkFieldId.match(/customfield_(\d+)/);
  if (!fieldIdMatch) {
    throw new Error(`Invalid Epic Link field ID format: ${epicLinkFieldId}`);
  }
  const fieldNumber = fieldIdMatch[1];

  // Build JQL with Epic Link
  let jql = `cf[${fieldNumber}] = ${epicKey}`;

  // Optionally include subtasks
  if (includeSubtasks) {
    jql += ` OR parent = ${epicKey}`;
  }

  // Add ordering
  jql += ` ORDER BY ${orderBy} ASC`;

  return jql;
}

export async function handleSearchByEpic(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(SearchByEpicInputSchema, input);

    log.info(`Searching for issues linked to Epic: ${validated.epicKey}...`);

    // Find the Epic Link custom field ID
    const epicLinkFieldId = await findEpicLinkFieldId();

    // Build the JQL query
    const jql = buildJQL(
      validated.epicKey,
      epicLinkFieldId,
      validated.includeSubtasks || false,
      validated.orderBy || 'created'
    );

    log.info(`Built JQL query: "${jql}"`);

    // Prepare search parameters
    const searchParams: any = {
      jql,
      maxResults: validated.maxResults || 50,
    };

    if (validated.nextPageToken !== undefined) searchParams.nextPageToken = validated.nextPageToken;
    if (validated.fields !== undefined) searchParams.fields = validated.fields;
    if (validated.expand !== undefined) searchParams.expand = validated.expand;

    // Execute search using existing API helper
    const result = await searchIssues(searchParams);

    log.info(
      `Found ${result.total} issue(s) linked to Epic ${validated.epicKey}, showing ${result.issues.length}`
    );

    return formatSearchResultsResponse(result);
  } catch (error) {
    log.error('Error in handleSearchByEpic:', error);
    return handleError(error);
  }
}
