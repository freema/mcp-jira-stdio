export const JIRA_CONFIG = {
  API_VERSION: '3',
  BASE_PATH: '/rest/api/3',
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 60000, // 1 minute
  },
} as const;

export const ERROR_MESSAGES = {
  AUTH_REQUIRED:
    'Jira authentication required. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN environment variables.',
  INVALID_CREDENTIALS: 'Invalid Jira credentials. Please check your email and API token.',
  PROJECT_NOT_FOUND: "Project not found or you don't have permission to access it.",
  ISSUE_NOT_FOUND: "Issue not found or you don't have permission to access it.",
  RATE_LIMIT_EXCEEDED: 'Jira API rate limit exceeded. Please wait and try again.',
  NETWORK_ERROR: 'Network error occurred while connecting to Jira.',
  VALIDATION_ERROR: 'Input validation failed.',
} as const;

export const TOOL_NAMES = {
  GET_VISIBLE_PROJECTS: 'jira_get_visible_projects',
  GET_ISSUE: 'jira_get_issue',
  SEARCH_ISSUES: 'jira_search_issues',
  GET_MY_ISSUES: 'jira_get_my_issues',
  GET_ISSUE_TYPES: 'jira_get_issue_types',
  GET_USERS: 'jira_get_users',
  GET_PRIORITIES: 'jira_get_priorities',
  GET_STATUSES: 'jira_get_statuses',
  CREATE_ISSUE: 'jira_create_issue',
  UPDATE_ISSUE: 'jira_update_issue',
  ADD_COMMENT: 'jira_add_comment',
  GET_PROJECT_INFO: 'jira_get_project_info',
  CREATE_SUBTASK: 'jira_create_subtask',
  GET_CREATE_META: 'jira_get_create_meta',
  GET_CUSTOM_FIELDS: 'jira_get_custom_fields',
  LINK_ISSUES: 'jira_link_issues',
} as const;
