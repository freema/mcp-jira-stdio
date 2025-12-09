import { AxiosRequestConfig } from 'axios';
import { makeJiraRequest } from './jira-auth.js';
import {
  JiraProject,
  JiraIssue,
  JiraSearchResult,
  JiraUser,
  JiraIssueType,
  JiraPriority,
  JiraStatus,
  JiraComment,
  JiraCommentsResponse,
  JiraProjectDetails,
  JiraCreateIssueResponse,
  JiraCreateMetaResponse,
  JiraField,
} from '../types/jira.js';
import { PaginatedResponse } from '../types/common.js';
import { sanitizeJQL } from './validators.js';
import mdToAdf from 'md-to-adf';

// Convert a description into Atlassian Document Format (ADF) based on the specified format.
// Supports three formats:
// - 'markdown': Converts Markdown syntax to ADF using md-to-adf
// - 'adf': Returns the description as-is (assumes it's already an ADF object)
// - 'plain': Converts plain text to ADF with basic formatting heuristics
function ensureAdfDescription(desc: any, format: 'markdown' | 'adf' | 'plain' = 'markdown'): any {
  if (!desc) return desc;
  if (typeof desc === 'object') return desc; // assume already ADF
  if (typeof desc !== 'string') return desc;

  // Handle markdown format
  if (format === 'markdown') {
    try {
      return mdToAdf(desc);
    } catch (error) {
      // If markdown conversion fails, fall back to plain text conversion
      console.warn('Markdown to ADF conversion failed, falling back to plain text:', error);
      format = 'plain';
    }
  }

  // Handle ADF format (already handled above with typeof === 'object')
  if (format === 'adf') {
    return desc;
  }

  // Handle plain text format with basic heuristics
  // (original ensureAdfDescription logic below)

  const urlRegex = /https?:\/\/[^\s)]+/g;

  const makeTextNodes = (text: string): any[] => {
    const nodes: any[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(text)) !== null) {
      const [url] = match;
      const start = match.index;
      if (start > lastIndex) {
        nodes.push({ type: 'text', text: text.slice(lastIndex, start) });
      }
      nodes.push({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] });
      lastIndex = start + url.length;
    }
    if (lastIndex < text.length) {
      nodes.push({ type: 'text', text: text.slice(lastIndex) });
    }
    return nodes.length ? nodes : [{ type: 'text', text }];
  };

  const lines = desc.split(/\r?\n/);
  const content: any[] = [];

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i] ?? '';
    const line = raw.trimEnd();
    if (line.trim().length === 0) {
      // Blank line – add empty paragraph for spacing
      content.push({ type: 'paragraph', content: [] });
      i++;
      continue;
    }

    // Section label on its own line: "Something:" → bold label paragraph
    const soloLabelMatch = /^(?<title>[^:]{2,}):\s*$/.exec(line);
    if (soloLabelMatch?.groups?.title) {
      const title = `${soloLabelMatch.groups.title}:`;
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: title, marks: [{ type: 'strong' }] }],
      });
      i++;

      // Special-case: Stack trace section → capture following non-empty lines as codeBlock
      if (/^stack\s*trace$/i.test(soloLabelMatch.groups.title.trim())) {
        const codeLines: string[] = [];
        while (i < lines.length && (lines[i] ?? '').trim().length > 0) {
          codeLines.push(lines[i] as string);
          i++;
        }
        if (codeLines.length) {
          content.push({
            type: 'codeBlock',
            attrs: { language: '' },
            content: [{ type: 'text', text: codeLines.join('\n') }],
          });
        }
      }
      continue;
    }

    // Ordered list group
    if (/^\d+\.\s+/.test(line)) {
      const items: any[] = [];
      while (i < lines.length) {
        const cur = lines[i] ?? '';
        if (!/^\d+\.\s+/.test(cur)) break;
        const itemText = cur.replace(/^\d+\.\s+/, '');
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: makeTextNodes(itemText) }],
        });
        i++;
      }
      content.push({ type: 'orderedList', content: items });
      continue;
    }

    // Bullet list group
    if (/^(?:[-•])\s+/.test(line)) {
      const items: any[] = [];
      while (i < lines.length) {
        const cur = lines[i] ?? '';
        if (!/^(?:[-•])\s+/.test(cur)) break;
        const itemText = cur.replace(/^(?:[-•])\s+/, '');
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: makeTextNodes(itemText) }],
        });
        i++;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    // Label: value → bold label then text
    const labelMatch =
      /^(?<label>[A-ZÁČĎÉĚÍĽĹŇÓŘŠŤÚŮÝŽa-záčďéěíľĺňóřšťúůýž\s]+):\s+(?<value>.+)$/.exec(line);
    if (labelMatch?.groups?.label && labelMatch.groups.value) {
      content.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: `${labelMatch.groups.label}:`, marks: [{ type: 'strong' }] },
          { type: 'text', text: ' ' },
          ...makeTextNodes(labelMatch.groups.value),
        ],
      });
      i++;
      continue;
    }

    // Fallback paragraph; make lines that look like paths/methods monospace
    if (/^\//.test(line) || /[A-Za-z]:\\/.test(line)) {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line, marks: [{ type: 'code' }] }],
      });
    } else {
      content.push({ type: 'paragraph', content: makeTextNodes(line) });
    }
    i++;
  }

  return { type: 'doc', version: 1, content };
}

export async function getVisibleProjects(
  options: {
    expand?: string[];
    recent?: number;
  } = {}
): Promise<JiraProject[]> {
  const allProjects: JiraProject[] = [];
  let startAt = 0;
  let isLast = false;

  // Fetch all pages of projects
  while (!isLast) {
    const params: Record<string, any> = {
      startAt,
      maxResults: 50, // Jira default, fetch 50 projects per page
    };

    if (options.expand) {
      params.expand = options.expand.join(',');
    }

    if (options.recent) {
      params.recent = options.recent;
    }

    const config: AxiosRequestConfig = {
      method: 'GET',
      url: '/project/search',
      params,
    };

    const response = await makeJiraRequest<PaginatedResponse<JiraProject>>(config);

    allProjects.push(...response.values);
    isLast = response.isLast;
    startAt += response.maxResults;
  }

  return allProjects;
}

export async function getIssue(
  issueKey: string,
  options: {
    expand?: string[];
    fields?: string[];
  } = {}
): Promise<JiraIssue> {
  const params: Record<string, any> = {};

  if (options.expand) {
    params.expand = options.expand.join(',');
  }

  if (options.fields) {
    params.fields = options.fields.join(',');
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/issue/${issueKey}`,
    params,
  };

  return await makeJiraRequest<JiraIssue>(config);
}

export async function searchIssues(options: {
  jql: string;
  nextPageToken?: string;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
}): Promise<JiraSearchResult> {
  const { jql, nextPageToken, maxResults = 50 } = options;

  // Sanitize JQL
  const sanitizedJql = sanitizeJQL(jql);

  const data: Record<string, any> = {
    jql: sanitizedJql,
    maxResults,
  };

  if (nextPageToken) {
    data.nextPageToken = nextPageToken;
  }

  if (options.fields) {
    data.fields = options.fields;
  }

  if (options.expand && options.expand.length > 0) {
    // Jira API expects expand as comma-separated string for POST /search/jql
    data.expand = options.expand.join(',');
  }

  const config: AxiosRequestConfig = {
    method: 'POST',
    url: '/search/jql',
    data,
  };

  return await makeJiraRequest<JiraSearchResult>(config);
}

export async function createIssue(
  issueData: {
    projectKey: string;
    summary: string;
    description?: string;
    issueType: string;
    priority?: string;
    assignee?: string;
    labels?: string[];
    components?: string[];
    customFields?: Record<string, any>;
    format?: 'markdown' | 'adf' | 'plain';
  },
  options: { returnIssue?: boolean } = { returnIssue: true }
): Promise<JiraIssue | string> {
  const fields: Record<string, any> = {
    project: { key: issueData.projectKey },
    summary: issueData.summary,
    issuetype: { name: issueData.issueType },
  };

  if (issueData.description !== undefined) {
    fields.description = ensureAdfDescription(
      issueData.description,
      issueData.format || 'markdown'
    );
  }

  if (issueData.priority) {
    fields.priority = { name: issueData.priority };
  }

  if (issueData.assignee) {
    fields.assignee = { accountId: issueData.assignee };
  }

  if (issueData.labels && issueData.labels.length > 0) {
    fields.labels = issueData.labels;
  }

  if (issueData.components && issueData.components.length > 0) {
    fields.components = issueData.components.map((name) => ({ name }));
  }

  // Merge any custom fields provided by the caller
  if (issueData.customFields && typeof issueData.customFields === 'object') {
    for (const [key, value] of Object.entries(issueData.customFields)) {
      // Do not overwrite standard fields if accidentally duplicated
      if (!(key in fields)) {
        fields[key] = value;
      }
    }
  }

  const config: AxiosRequestConfig = {
    method: 'POST',
    url: '/issue',
    data: { fields },
  };

  const response = await makeJiraRequest<{ key: string; id: string; self: string }>(config);

  if (options.returnIssue === false) {
    return response.key;
  }

  // Return the created issue
  return await getIssue(response.key);
}

export async function updateIssue(
  issueKey: string,
  updates: {
    summary?: string;
    description?: string;
    priority?: string;
    assignee?: string;
    labels?: string[];
    components?: string[];
    format?: 'markdown' | 'adf' | 'plain';
  }
): Promise<void> {
  const fields: Record<string, any> = {};

  if (updates.summary !== undefined) {
    fields.summary = updates.summary;
  }

  if (updates.description !== undefined) {
    fields.description = ensureAdfDescription(updates.description, updates.format || 'markdown');
  }

  if (updates.priority !== undefined) {
    fields.priority = { name: updates.priority };
  }

  if (updates.assignee !== undefined) {
    fields.assignee = updates.assignee ? { accountId: updates.assignee } : null;
  }

  if (updates.labels !== undefined) {
    fields.labels = updates.labels;
  }

  if (updates.components !== undefined) {
    fields.components = updates.components.map((name) => ({ name }));
  }

  const config: AxiosRequestConfig = {
    method: 'PUT',
    url: `/issue/${issueKey}`,
    data: { fields },
  };

  await makeJiraRequest(config);
}

export async function getCurrentUser(): Promise<JiraUser> {
  const config: AxiosRequestConfig = {
    method: 'GET',
    url: '/myself',
  };

  return await makeJiraRequest<JiraUser>(config);
}

export async function getMyIssues(
  options: {
    nextPageToken?: string;
    maxResults?: number;
    fields?: string[];
    expand?: string[];
  } = {}
): Promise<JiraSearchResult> {
  const jql = `assignee = currentUser() ORDER BY updated DESC`;

  const searchParams: any = {
    jql,
    maxResults: options.maxResults || 50,
  };

  if (options.nextPageToken !== undefined) searchParams.nextPageToken = options.nextPageToken;
  if (options.fields !== undefined) searchParams.fields = options.fields;
  if (options.expand !== undefined) searchParams.expand = options.expand;

  return await searchIssues(searchParams);
}

export async function getIssueTypes(projectKey?: string): Promise<JiraIssueType[]> {
  let url = '/issuetype';

  if (projectKey) {
    url = `/project/${projectKey}/issuetype`;
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url,
  };

  return await makeJiraRequest<JiraIssueType[]>(config);
}

export async function getUsers(
  options: {
    query?: string;
    username?: string;
    accountId?: string;
    startAt?: number;
    maxResults?: number;
  } = {}
): Promise<JiraUser[]> {
  const params: Record<string, any> = {};

  if (options.query) {
    params.query = options.query;
  }

  if (options.username) {
    params.username = options.username;
  }

  if (options.accountId) {
    params.accountId = options.accountId;
  }

  if (options.startAt !== undefined) {
    params.startAt = options.startAt;
  }

  if (options.maxResults !== undefined) {
    params.maxResults = options.maxResults;
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: '/user/search',
    params,
  };

  return await makeJiraRequest<JiraUser[]>(config);
}

export async function getPriorities(): Promise<JiraPriority[]> {
  const config: AxiosRequestConfig = {
    method: 'GET',
    url: '/priority',
  };

  return await makeJiraRequest<JiraPriority[]>(config);
}

export async function getStatuses(
  options: {
    projectKey?: string;
    issueTypeId?: string;
  } = {}
): Promise<JiraStatus[]> {
  let url = '/status';

  if (options.projectKey && options.issueTypeId) {
    url = `/project/${options.projectKey}/statuses`;
  } else if (options.projectKey) {
    url = `/project/${options.projectKey}/statuses`;
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url,
  };

  if (options.projectKey) {
    const response =
      await makeJiraRequest<Array<{ id?: string; name: string; statuses: JiraStatus[] }>>(config);
    if (options.issueTypeId) {
      const match = response.find(
        (issueType) =>
          issueType.id === options.issueTypeId || issueType.name === options.issueTypeId
      );
      if (match) return match.statuses;
    }
    // Flatten the statuses from all issue types
    return response.flatMap((issueType) => issueType.statuses);
  }
  return await makeJiraRequest<JiraStatus[]>(config);
}

export async function addComment(
  issueKey: string,
  body: string,
  visibility?: { type: string; value: string },
  format?: 'markdown' | 'adf' | 'plain'
): Promise<JiraComment> {
  // Convert body to ADF format (Jira expects ADF for comments)
  const adfBody = ensureAdfDescription(body, format || 'markdown');

  const data: any = {
    body: adfBody,
  };

  if (visibility) {
    data.visibility = visibility;
  }

  const config: AxiosRequestConfig = {
    method: 'POST',
    url: `/issue/${issueKey}/comment`,
    data,
  };

  return await makeJiraRequest<JiraComment>(config);
}

export async function getComments(
  issueKey: string,
  options: {
    maxResults?: number;
    orderBy?: string;
    startAt?: number;
  } = {}
): Promise<JiraCommentsResponse> {
  const params: Record<string, any> = {};

  if (options.maxResults !== undefined) {
    params.maxResults = options.maxResults;
  }

  if (options.orderBy !== undefined) {
    params.orderBy = options.orderBy;
  }

  if (options.startAt !== undefined) {
    params.startAt = options.startAt;
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/issue/${issueKey}/comment`,
    params,
  };

  return await makeJiraRequest<JiraCommentsResponse>(config);
}

export async function getProjectDetails(
  projectKey: string,
  expand?: string[]
): Promise<JiraProjectDetails> {
  const params: Record<string, any> = {};

  if (expand) {
    params.expand = expand.join(',');
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/project/${projectKey}`,
    params,
  };

  return await makeJiraRequest<JiraProjectDetails>(config);
}

export async function createSubtask(
  parentIssueKey: string,
  subtaskData: {
    summary: string;
    description?: string;
    priority?: string;
    assignee?: string;
    labels?: string[];
    components?: string[];
    format?: 'markdown' | 'adf' | 'plain';
  }
): Promise<JiraIssue> {
  // First get parent issue to determine project and subtask issue type
  const parentIssue = await getIssue(parentIssueKey);
  const projectKey = parentIssue.fields.project.key;

  // Get available issue types for the project
  const issueTypes = await getIssueTypes(projectKey);
  const subtaskType = issueTypes.find((type) => type.subtask);

  if (!subtaskType) {
    throw new Error(`No subtask issue type found for project ${projectKey}`);
  }

  const fields: Record<string, any> = {
    project: { key: projectKey },
    parent: { key: parentIssueKey },
    summary: subtaskData.summary,
    issuetype: { id: subtaskType.id },
  };

  if (subtaskData.description !== undefined) {
    fields.description = ensureAdfDescription(
      subtaskData.description,
      subtaskData.format || 'markdown'
    );
  }

  if (subtaskData.priority) {
    fields.priority = { name: subtaskData.priority };
  }

  if (subtaskData.assignee) {
    fields.assignee = { accountId: subtaskData.assignee };
  }

  if (subtaskData.labels && subtaskData.labels.length > 0) {
    fields.labels = subtaskData.labels;
  }

  if (subtaskData.components && subtaskData.components.length > 0) {
    fields.components = subtaskData.components.map((name) => ({ name }));
  }

  const config: AxiosRequestConfig = {
    method: 'POST',
    url: '/issue',
    data: { fields },
  };

  const response = await makeJiraRequest<JiraCreateIssueResponse>(config);

  // Return the created subtask
  return await getIssue(response.key);
}

export async function getCreateMeta(
  options: {
    projectKeys?: string[];
    issueTypeNames?: string[];
    expand?: string;
  } = {}
): Promise<JiraCreateMetaResponse> {
  // Use the classic createmeta endpoint with expand parameter for reliability
  // This endpoint is widely supported and returns complete field metadata including allowedValues
  const params: Record<string, any> = {};

  if (options.projectKeys && options.projectKeys.length > 0) {
    params.projectKeys = options.projectKeys.join(',');
  }

  if (options.issueTypeNames && options.issueTypeNames.length > 0) {
    params.issuetypeNames = options.issueTypeNames.join(',');
  }

  // Always use expand parameter to get full field metadata including allowedValues
  if (options.expand) {
    params.expand = options.expand;
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: '/issue/createmeta',
    params,
  };

  return await makeJiraRequest<JiraCreateMetaResponse>(config);
}

export async function getFields(): Promise<JiraField[]> {
  const config: AxiosRequestConfig = {
    method: 'GET',
    url: '/field',
  };

  return await makeJiraRequest<JiraField[]>(config);
}

export async function createIssueLink(
  fromIssue: string,
  toIssue: string,
  linkType: string
): Promise<void> {
  // Map common link type names to Jira link type format
  // Jira link types are case-sensitive
  const linkTypeMap: Record<string, string> = {
    blocks: 'Blocks',
    'is blocked by': 'Blocks',
    relates: 'Relates',
    'relates to': 'Relates',
    duplicates: 'Duplicate',
    duplicate: 'Duplicate',
    'is duplicated by': 'Duplicate',
    clones: 'Cloners',
    'is cloned by': 'Cloners',
  };

  const normalizedLinkType = linkType.toLowerCase();
  const jiraLinkType = linkTypeMap[normalizedLinkType] || linkType;

  // Determine issue direction based on link type
  // For "blocks": fromIssue blocks toIssue (fromIssue = outward, toIssue = inward)
  // For "is blocked by": fromIssue is blocked by toIssue (fromIssue = inward, toIssue = outward)
  const isInward =
    normalizedLinkType === 'is blocked by' ||
    normalizedLinkType === 'is duplicated by' ||
    normalizedLinkType === 'is cloned by';

  const data: any = {
    type: {
      name: jiraLinkType,
    },
  };

  if (isInward) {
    data.inwardIssue = { key: fromIssue };
    data.outwardIssue = { key: toIssue };
  } else {
    data.outwardIssue = { key: fromIssue };
    data.inwardIssue = { key: toIssue };
  }

  const config: AxiosRequestConfig = {
    method: 'POST',
    url: '/issueLink',
    data,
  };

  await makeJiraRequest(config);
}
