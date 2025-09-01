import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpToolResponse } from '../types/common.js';
import { CreateIssueInputSchema } from '../types/tools.js';
import { validateInput } from '../utils/validators.js';
import { createIssue } from '../utils/api-helpers.js';
import { formatIssueResponse } from '../utils/formatters.js';
import { handleError } from '../utils/error-handler.js';
import { TOOL_NAMES } from '../config/constants.js';
import { createLogger } from '../utils/logger.js';
import { formatSuccessResponse } from '../utils/formatters.js';

const log = createLogger('tool:create-issue');

export const createIssueTool: Tool = {
  name: TOOL_NAMES.CREATE_ISSUE,
  description:
    'Creates a new Jira issue in the specified project. Supports setting issue type, priority, assignee, labels, and components. Returns the created issue with all details.',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: 'Project key where the issue will be created',
      },
      summary: {
        type: 'string',
        description: 'Issue summary/title',
        minLength: 1,
      },
      description: {
        type: 'string',
        description: 'Detailed issue description (optional)',
      },
      issueType: {
        type: 'string',
        description: 'Issue type name (e.g., Bug, Story, Task, Epic)',
      },
      priority: {
        type: 'string',
        description: 'Issue priority name (e.g., High, Medium, Low) - optional',
      },
      assignee: {
        type: 'string',
        description: 'Assignee account ID (optional)',
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Issue labels (optional)',
        default: [],
      },
      components: {
        type: 'array',
        items: { type: 'string' },
        description: 'Component names (optional)',
        default: [],
      },
      customFields: {
        type: 'object',
        additionalProperties: true,
        description:
          'Additional Jira fields, e.g. { "customfield_10071": value }. Use this to set required custom fields.',
      },
      returnIssue: {
        type: 'boolean',
        description: 'If false, returns only the issue key without fetching full details',
        default: true,
      },
    },
    required: ['projectKey', 'summary', 'issueType'],
  },
};

export async function handleCreateIssue(input: unknown): Promise<McpToolResponse> {
  try {
    const validated = validateInput(CreateIssueInputSchema, input);

    log.info(`Creating issue in project ${validated.projectKey}...`);

    const createParams: any = {
      projectKey: validated.projectKey,
      summary: validated.summary,
      issueType: validated.issueType,
    };

    if (validated.description !== undefined) createParams.description = validated.description;
    if (validated.priority !== undefined) createParams.priority = validated.priority;
    if (validated.assignee !== undefined) createParams.assignee = validated.assignee;
    if (validated.labels !== undefined) createParams.labels = validated.labels;
    if (validated.components !== undefined) createParams.components = validated.components;
    if (validated.customFields !== undefined) createParams.customFields = validated.customFields;

    let issueOrKey;
    if (validated.returnIssue === false) {
      issueOrKey = await createIssue(createParams, { returnIssue: false });
    } else {
      // Default behavior: request full issue; keep API surface compatible with tests
      issueOrKey = await createIssue(createParams);
    }

    if (validated.returnIssue === false) {
      const key = typeof issueOrKey === 'string' ? issueOrKey : (issueOrKey as any).key;
      log.info(`Created issue ${key}`);
      return formatSuccessResponse(`Issue created: ${key}`);
    }

    const issue = issueOrKey as any;
    log.info(`Created issue ${issue.key}`);
    return formatIssueResponse(issue);
  } catch (error) {
    log.error('Error in handleCreateIssue:', error);
    return handleError(error);
  }
}
