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
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      return `• **${issue.key}** - ${issue.fields.summary}\n  Status: ${issue.fields.status.name} | Assignee: ${assignee} | Priority: ${issue.fields.priority?.name || 'None'}`;
    })
    .join('\n\n');

  const paginationInfo =
    result.total > result.maxResults
      ? `\n\n*Showing ${result.startAt + 1}-${Math.min(result.startAt + result.maxResults, result.total)} of ${result.total} results*`
      : '';

  return {
    content: [
      {
        type: 'text',
        text: `Found ${result.total} issue(s):\n\n${issuesList}${paginationInfo}`,
      },
    ],
  };
}

export function formatErrorResponse(error: any): McpToolResponse {
  let errorMessage = 'An unexpected error occurred.';

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (error?.response?.data) {
    const jiraError = error.response.data;
    if (jiraError.errorMessages && jiraError.errorMessages.length > 0) {
      errorMessage = jiraError.errorMessages.join(', ');
    } else if (jiraError.errors) {
      errorMessage = Object.entries(jiraError.errors)
        .map(([field, message]) => `${field}: ${message}`)
        .join(', ');
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `❌ Error: ${errorMessage}`,
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
