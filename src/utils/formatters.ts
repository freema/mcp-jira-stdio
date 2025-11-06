import { McpToolResponse } from '../types/common.js';
import { maybeRedactAccountId, maybeRedactEmail } from './redaction.js';
import {
  JiraProject,
  JiraIssue,
  JiraSearchResult,
  JiraUser,
  JiraIssueType,
  JiraPriority,
  JiraStatus,
  JiraComment,
  JiraProjectDetails,
  JiraCreateMetaResponse,
  JiraField,
} from '../types/jira.js';

export function formatProjectsResponse(projects: JiraProject[]): McpToolResponse {
  const projectsList = projects
    .map(
      (project) =>
        `• **${project.key}** - ${project.name}\n  ${project.description || 'No description'}\n  Type: ${project.projectTypeKey} | Private: ${project.isPrivate ? 'Yes' : 'No'}`
    )
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${projects.length} visible project(s):\n\n${projectsList}`,
      },
    ],
  };
}

function adfToPlainText(adf: any): string {
  // Very lightweight ADF to text conversion (best-effort)
  try {
    const walk = (node: any): string => {
      if (!node) return '';
      switch (node.type) {
        case 'text':
          return node.text || '';
        case 'paragraph':
        case 'heading':
        case 'blockquote':
          return (node.content || []).map(walk).join('');
        case 'codeBlock':
          return '\n' + (node.content || []).map(walk).join('') + '\n';
        case 'bulletList':
        case 'orderedList':
          return (node.content || []).map(walk).join('\n');
        case 'listItem':
          return '• ' + (node.content || []).map(walk).join('');
        case 'hardBreak':
          return '\n';
        default:
          if (Array.isArray(node.content)) return node.content.map(walk).join('');
          return '';
      }
    };
    if (adf && Array.isArray(adf.content)) {
      return adf.content.map(walk).join('\n').trim();
    }
  } catch {
    // ignore and fallback
  }
  return '';
}

export function formatIssueResponse(issue: JiraIssue): McpToolResponse {
  const { key, fields } = issue;

  const summary = fields?.summary || 'No summary';

  const assigneeText = fields?.assignee
    ? `${fields.assignee.displayName} (${maybeRedactAccountId(fields.assignee.accountId)})`
    : 'Unassigned';

  const reporterText = fields?.reporter
    ? `${fields.reporter.displayName} (${maybeRedactAccountId(fields.reporter.accountId)})`
    : 'Unknown';

  const labelsArray = Array.isArray(fields?.labels) ? fields.labels : [];
  const labelsText = labelsArray.length > 0 ? labelsArray.join(', ') : 'None';

  const componentsArray = Array.isArray(fields?.components) ? fields.components : [];
  const componentsText =
    componentsArray.length > 0 ? componentsArray.map((c) => c.name).join(', ') : 'None';

  let description = fields?.description as any;
  if (description && typeof description === 'object') {
    const parsed = adfToPlainText(description);
    description = parsed || '[rich text description omitted]';
  }
  if (!description || typeof description !== 'string') {
    description = 'No description provided';
  }

  const createdText = fields?.created ? new Date(fields.created).toISOString() : 'N/A';
  const updatedText = fields?.updated ? new Date(fields.updated).toISOString() : 'N/A';

  return {
    content: [
      {
        type: 'text',
        text: `**${key}: ${summary}**\n\n**Status:** ${fields?.status?.name || 'Unknown'}\n**Priority:** ${fields?.priority?.name || 'None'}\n**Assignee:** ${assigneeText}\n**Reporter:** ${reporterText}\n**Project:** ${fields?.project?.name || 'Unknown'} (${fields?.project?.key || 'N/A'})\n**Issue Type:** ${fields?.issuetype?.name || 'Unknown'}\n**Labels:** ${labelsText}\n**Components:** ${componentsText}\n**Created:** ${createdText}\n**Updated:** ${updatedText}\n\n**Description:**\n${description}`,
      },
    ],
  };
}

export function formatSearchResultsResponse(result: JiraSearchResult): McpToolResponse {
  if (result.issues.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No issues found matching your search criteria.',
        },
      ],
    };
  }

  const issuesList = result.issues
    .map((issue) => {
      const assignee = issue.fields?.assignee?.displayName || 'Unassigned';
      const summary = issue.fields?.summary || 'No summary';
      const status = issue.fields?.status?.name || 'Unknown';
      const priority = issue.fields?.priority?.name || 'None';
      return `• **${issue.key}** - ${summary}\n  Status: ${status} | Assignee: ${assignee} | Priority: ${priority}`;
    })
    .join('\n\n');

  const rangeStart = result.startAt + 1;
  const rangeEnd = Math.min(result.startAt + result.maxResults, result.total);
  const showRangeInline = result.total > result.maxResults || result.startAt > 0;

  // Build pagination info
  let paginationInfo = '';
  if (showRangeInline) {
    paginationInfo = `\n\n*Showing ${rangeStart}-${rangeEnd} of ${result.total} results*`;
  }

  // Add nextPageToken info if present and not last page
  if (result.nextPageToken && !result.isLast) {
    paginationInfo += `\n*Next page token: \`${result.nextPageToken}\`*`;
  } else if (result.isLast) {
    paginationInfo += '\n*This is the last page of results*';
  }

  return {
    content: [
      {
        type: 'text',
        text: `Found ${result.total} issue(s)${showRangeInline ? ` (showing ${rangeStart}-${rangeEnd})` : ''}:\n\n${issuesList}${paginationInfo}`,
      },
    ],
  };
}

export function formatErrorResponse(error: any): McpToolResponse {
  let errorMessage = 'An unexpected error occurred.';
  let hasCustomFieldError = false;

  if (typeof error === 'string') {
    errorMessage = error;
    hasCustomFieldError = error.includes('customfield_');
  } else if (error instanceof Error) {
    errorMessage = error.message;
    hasCustomFieldError = error.message.includes('customfield_');
  } else if (error?.response?.data) {
    const jiraError = error.response.data;
    if (jiraError.errorMessages && jiraError.errorMessages.length > 0) {
      errorMessage = jiraError.errorMessages.join(', ');
    } else if (jiraError.errors) {
      const errors = Object.entries(jiraError.errors);
      errorMessage = errors.map(([field, message]) => `${field}: ${message}`).join(', ');

      // Check if any error is related to custom fields
      hasCustomFieldError = errors.some(([field]) => field.startsWith('customfield_'));
    }
  }

  // Add helpful hint for custom field errors
  let hint = '';
  if (hasCustomFieldError) {
    hint = `\n\n💡 **Hint:** This error involves custom fields. Use 'jira_get_create_meta' tool to discover required fields and their allowed values before creating an issue.`;
  }

  return {
    content: [
      {
        type: 'text',
        text: `❌ Error: ${errorMessage}${hint}`,
      },
    ],
  };
}

export function formatSuccessResponse(message: string): McpToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: `✅ ${message}`,
      },
    ],
  };
}

export function formatUsersResponse(users: JiraUser[]): McpToolResponse {
  if (users.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No users found matching your search criteria.',
        },
      ],
    };
  }

  const usersList = users
    .map(
      (user) =>
        `• **${user.displayName}** (${maybeRedactAccountId(user.accountId)})\n  Email: ${maybeRedactEmail(user.emailAddress)} | Active: ${user.active ? 'Yes' : 'No'} | Type: ${user.accountType}`
    )
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${users.length} user(s):\n\n${usersList}`,
      },
    ],
  };
}

export function formatIssueTypesResponse(issueTypes: JiraIssueType[]): McpToolResponse {
  if (issueTypes.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No issue types found.',
        },
      ],
    };
  }

  const typesList = issueTypes
    .map(
      (type) =>
        `• **${type.name}** (ID: ${type.id})\n  ${type.description}\n  Subtask: ${type.subtask ? 'Yes' : 'No'}`
    )
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${issueTypes.length} issue type(s):\n\n${typesList}`,
      },
    ],
  };
}

export function formatPrioritiesResponse(priorities: JiraPriority[]): McpToolResponse {
  if (priorities.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No priorities found.',
        },
      ],
    };
  }

  const prioritiesList = priorities
    .map((priority) => `• **${priority.name}** (ID: ${priority.id})\n  ${priority.description}`)
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${priorities.length} priority level(s):\n\n${prioritiesList}`,
      },
    ],
  };
}

export function formatStatusesResponse(statuses: JiraStatus[]): McpToolResponse {
  if (statuses.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No statuses found.',
        },
      ],
    };
  }

  const statusesList = statuses
    .map(
      (status) =>
        `• **${status.name}** (ID: ${status.id})\n  ${status.description}\n  Category: ${status.statusCategory.name} (${status.statusCategory.key})`
    )
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${statuses.length} status(es):\n\n${statusesList}`,
      },
    ],
  };
}

export function formatCommentResponse(comment: JiraComment): McpToolResponse {
  const visibilityText = comment.visibility
    ? `\n**Visibility:** ${comment.visibility.type} - ${comment.visibility.value}`
    : '';

  return {
    content: [
      {
        type: 'text',
        text: `**Comment added successfully**

**Author:** ${comment.author.displayName}
**Created:** ${new Date(comment.created).toISOString()}${visibilityText}

**Content:**
${comment.body}`,
      },
    ],
  };
}

export function formatProjectDetailsResponse(project: JiraProjectDetails): McpToolResponse {
  const leadText = project.lead
    ? `${project.lead.displayName} (${project.lead.accountId})`
    : 'No lead assigned';

  const componentsText =
    project.components.length > 0 ? project.components.map((c) => c.name).join(', ') : 'None';

  const versionsText =
    project.versions.length > 0 ? project.versions.map((v) => v.name).join(', ') : 'None';

  const issueTypesText =
    project.issueTypes.length > 0
      ? project.issueTypes.map((t) => `${t.name}${t.subtask ? ' (Subtask)' : ''}`).join(', ')
      : 'None';

  const rolesText =
    Object.keys(project.roles).length > 0 ? Object.keys(project.roles).join(', ') : 'None';

  const insightText = project.insight
    ? `\n\n**Project Insights:**
Total Issues: ${project.insight.totalIssueCount}
Last Updated: ${new Date(project.insight.lastIssueUpdateTime).toISOString()}`
    : '';

  return {
    content: [
      {
        type: 'text',
        text: `**${project.key}: ${project.name}**

**Description:** ${project.description || 'No description'}
**Type:** ${project.projectTypeKey}
**Private:** ${project.isPrivate ? 'Yes' : 'No'}
**Lead:** ${leadText}

**Components:** ${componentsText}
**Versions:** ${versionsText}
**Issue Types:** ${issueTypesText}
**Roles:** ${rolesText}${insightText}`,
      },
    ],
  };
}

export function formatCreateMetaResponse(meta: JiraCreateMetaResponse): McpToolResponse {
  if (!meta.projects || meta.projects.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No create metadata found for the specified project.',
        },
      ],
    };
  }

  const project = meta.projects[0];
  if (!project) {
    return {
      content: [
        {
          type: 'text',
          text: 'No create metadata found for the specified project.',
        },
      ],
    };
  }

  const issueTypesList = project.issuetypes
    .map((issueType) => {
      const requiredFields: string[] = [];
      const optionalFields: string[] = [];

      Object.entries(issueType.fields).forEach(([fieldKey, field]) => {
        const allowedValuesText = field.allowedValues
          ? `\n    Allowed values: ${field.allowedValues.map((v) => v.name || v.value || v.id).join(', ')}`
          : '';
        const defaultValueText = field.hasDefaultValue
          ? `\n    Default: ${JSON.stringify(field.defaultValue)}`
          : '';

        const fieldInfo = `  • **${field.name}** (${fieldKey})\n    Type: ${field.schema.type}${allowedValuesText}${defaultValueText}`;

        if (field.required) {
          requiredFields.push(fieldInfo);
        } else {
          optionalFields.push(fieldInfo);
        }
      });

      const requiredSection =
        requiredFields.length > 0
          ? `**Required Fields:**\n${requiredFields.join('\n\n')}`
          : 'No required fields';
      const optionalSection =
        optionalFields.length > 0 ? `\n\n**Optional Fields:**\n${optionalFields.join('\n\n')}` : '';

      return `### ${issueType.name} (${issueType.subtask ? 'Subtask' : 'Issue'})\n${issueType.description}\n\n${requiredSection}${optionalSection}`;
    })
    .join('\n\n---\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `**Create Metadata for Project: ${project.name} (${project.key})**\n\n${issueTypesList}`,
      },
    ],
  };
}

export function formatCustomFieldsResponse(
  fields: JiraField[],
  projectKey?: string
): McpToolResponse {
  const customFields = fields.filter((field) => field.custom);

  if (customFields.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: projectKey
            ? `No custom fields found for project ${projectKey}.`
            : 'No custom fields found.',
        },
      ],
    };
  }

  const fieldsList = customFields
    .map((field) => {
      const schemaInfo = field.schema.custom
        ? `Custom Type: ${field.schema.custom}`
        : `Type: ${field.schema.type}`;
      return `• **${field.name}** (${field.key})\n  ${schemaInfo}\n  ID: ${field.id}`;
    })
    .join('\n\n');

  const header = projectKey
    ? `Found ${customFields.length} custom field(s) for project ${projectKey}:`
    : `Found ${customFields.length} custom field(s):`;

  return {
    content: [
      {
        type: 'text',
        text: `${header}\n\n${fieldsList}`,
      },
    ],
  };
}
