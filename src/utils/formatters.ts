import { McpToolResponse } from '../types/common.js';
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

export function formatIssueResponse(issue: JiraIssue): McpToolResponse {
  const { key, fields } = issue;

  const assigneeText = fields.assignee
    ? `${fields.assignee.displayName} (${fields.assignee.accountId})`
    : 'Unassigned';

  const reporterText = fields.reporter
    ? `${fields.reporter.displayName} (${fields.reporter.accountId})`
    : 'Unknown';

  const labelsText = fields.labels.length > 0 ? fields.labels.join(', ') : 'None';

  const componentsText =
    fields.components.length > 0 ? fields.components.map((c) => c.name).join(', ') : 'None';

  const description = fields.description || 'No description provided';

  return {
    content: [
      {
        type: 'text',
        text: `**${key}: ${fields.summary}**

**Status:** ${fields.status.name}
**Priority:** ${fields.priority?.name || 'None'}
**Assignee:** ${assigneeText}
**Reporter:** ${reporterText}
**Project:** ${fields.project.name} (${fields.project.key})
**Issue Type:** ${fields.issuetype.name}
**Labels:** ${labelsText}
**Components:** ${componentsText}
**Created:** ${new Date(fields.created).toISOString()}
**Updated:** ${new Date(fields.updated).toISOString()}

**Description:**
${description}`,
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
        `• **${user.displayName}** (${user.accountId})\n  Email: ${user.emailAddress || 'N/A'} | Active: ${user.active ? 'Yes' : 'No'} | Type: ${user.accountType}`
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
