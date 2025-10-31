export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
  properties?: Record<string, any>;
  entityId?: string;
  uuid?: string;
  avatarUrls: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
  projectCategory?: {
    self: string;
    id: string;
    name: string;
    description: string;
  };
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

export interface JiraIssueFields {
  summary: string;
  description?: string;
  status: JiraStatus;
  priority?: JiraPriority;
  assignee?: JiraUser;
  reporter?: JiraUser;
  created: string;
  updated: string;
  resolutiondate?: string;
  project: JiraProject;
  issuetype: JiraIssueType;
  labels: string[];
  components: JiraComponent[];
  fixVersions: JiraVersion[];
  versions: JiraVersion[];
}

export interface JiraStatus {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  self: string;
  statusCategory: {
    id: number;
    key: string;
    colorName: string;
    name: string;
    self: string;
  };
}

export interface JiraPriority {
  id: string;
  name: string;
  self: string;
  iconUrl: string;
  description: string;
}

export interface JiraUser {
  accountId: string;
  emailAddress?: string;
  displayName: string;
  active: boolean;
  timeZone?: string;
  accountType: string;
  avatarUrls: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
}

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  self: string;
  subtask: boolean;
}

export interface JiraComponent {
  id: string;
  name: string;
  description?: string;
  self: string;
}

export interface JiraVersion {
  id: string;
  name: string;
  description?: string;
  archived: boolean;
  released: boolean;
  releaseDate?: string;
  self: string;
}

export interface JiraSearchRequest {
  jql: string;
  nextPageToken?: string;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
  fieldsByKeys?: boolean;
  properties?: string[];
}

export interface JiraSearchResult {
  expand: string;
  startAt: number; // Still returned for backward compatibility
  maxResults: number;
  total: number;
  issues: JiraIssue[];
  nextPageToken?: string; // Token for pagination in new API
  isLast?: boolean; // Indicates if this is the last page
}

export interface JiraComment {
  id: string;
  self: string;
  author: JiraUser;
  body: string;
  created: string;
  updated: string;
  visibility?: {
    type: string;
    value: string;
  };
}

export interface JiraProjectDetails extends JiraProject {
  lead?: JiraUser;
  components: JiraComponent[];
  versions: JiraVersion[];
  issueTypes: JiraIssueType[];
  roles: Record<string, string>;
  insight?: {
    totalIssueCount: number;
    lastIssueUpdateTime: string;
  };
}

export interface JiraStatusCategory {
  id: number;
  key: string;
  colorName: string;
  name: string;
  self: string;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
  fields?: Record<string, any>;
}

export interface JiraCreateIssueResponse {
  id: string;
  key: string;
  self: string;
}
