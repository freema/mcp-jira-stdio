// Mock Jira API response data for testing

export const mockJiraUser = {
  accountId: 'test-account-id-123',
  displayName: 'Test User',
  emailAddress: 'test@example.com',
  active: true,
  self: 'https://test.atlassian.net/rest/api/3/user?accountId=test-account-id-123',
};

export const mockJiraProject = {
  id: 'test-project-id',
  key: 'TEST',
  name: 'Test Project',
  description: 'A test project',
  lead: mockJiraUser,
  self: 'https://test.atlassian.net/rest/api/3/project/TEST',
  projectTypeKey: 'software',
  style: 'classic',
};

export const mockJiraIssueType = {
  id: 'test-issue-type-id',
  name: 'Bug',
  description: 'A problem which impairs or prevents the functions of the product.',
  subtask: false,
  iconUrl: 'https://test.atlassian.net/images/icons/issuetypes/bug.png',
  self: 'https://test.atlassian.net/rest/api/3/issuetype/test-issue-type-id',
};

export const mockJiraSubtaskIssueType = {
  ...mockJiraIssueType,
  id: 'subtask-issue-type-id',
  name: 'Sub-task',
  subtask: true,
};

export const mockJiraPriority = {
  id: 'test-priority-id',
  name: 'High',
  description: 'This problem will block progress.',
  self: 'https://test.atlassian.net/rest/api/3/priority/test-priority-id',
  iconUrl: 'https://test.atlassian.net/images/icons/priorities/high.svg',
};

export const mockJiraStatus = {
  id: 'test-status-id',
  name: 'Open',
  description: 'The issue is open and ready for the assignee to start work on it.',
  self: 'https://test.atlassian.net/rest/api/3/status/test-status-id',
  statusCategory: {
    id: 2,
    key: 'new',
    colorName: 'blue-gray',
    name: 'New',
  },
};

export const mockJiraIssue = {
  id: 'test-issue-id',
  key: 'TEST-123',
  self: 'https://test.atlassian.net/rest/api/3/issue/TEST-123',
  fields: {
    summary: 'Test issue summary',
    description: 'Test issue description',
    project: mockJiraProject,
    issuetype: mockJiraIssueType,
    priority: mockJiraPriority,
    status: mockJiraStatus,
    assignee: mockJiraUser,
    reporter: mockJiraUser,
    created: '2023-01-01T00:00:00.000+0000',
    updated: '2023-01-01T00:00:00.000+0000',
    labels: ['test-label'],
    components: [],
  },
};

export const mockJiraComment = {
  id: 'test-comment-id',
  body: 'This is a test comment',
  author: mockJiraUser,
  updateAuthor: mockJiraUser,
  created: '2023-01-01T00:00:00.000+0000',
  updated: '2023-01-01T00:00:00.000+0000',
  self: 'https://test.atlassian.net/rest/api/3/issue/TEST-123/comment/test-comment-id',
  visibility: undefined,
};

export const mockJiraProjectDetails = {
  ...mockJiraProject,
  components: [],
  versions: [],
  roles: {
    Administrators: 'https://test.atlassian.net/rest/api/3/project/TEST/role/10002',
    Developers: 'https://test.atlassian.net/rest/api/3/project/TEST/role/10001',
  },
  issueTypes: [mockJiraIssueType],
};

export const mockJiraSearchResult = {
  startAt: 0,
  maxResults: 50,
  total: 1,
  expand: '',
  isLast: true,
  nextPageToken: undefined,
  issues: [mockJiraIssue],
};

export const mockJiraPaginatedProjects = {
  startAt: 0,
  maxResults: 50,
  total: 1,
  isLast: true,
  values: [mockJiraProject],
};

export const mockJiraCreateIssueResponse = {
  id: mockJiraIssue.id,
  key: mockJiraIssue.key,
  self: mockJiraIssue.self,
};

// Error responses
export const mockJiraErrorResponse = {
  errorMessages: ['Issue not found or permission denied'],
  errors: {},
  warningMessages: [],
};

export const mockJiraValidationErrorResponse = {
  errorMessages: [],
  errors: {
    summary: 'Summary is required',
    project: 'Project is required',
  },
  warningMessages: [],
};

// Network error
export const mockNetworkError = new Error('Network Error');
mockNetworkError.code = 'ECONNREFUSED';

// HTTP errors
export const mockUnauthorizedError = {
  response: {
    status: 401,
    data: {
      errorMessages: ['Authentication failed'],
    },
  },
};

export const mockForbiddenError = {
  response: {
    status: 403,
    data: {
      errorMessages: ['Insufficient permissions'],
    },
  },
};

export const mockNotFoundError = {
  response: {
    status: 404,
    data: {
      errorMessages: ['Resource not found'],
    },
  },
};

export const mockRateLimitError = {
  response: {
    status: 429,
    data: {
      errorMessages: ['Rate limit exceeded'],
    },
  },
};

export const mockServerError = {
  response: {
    status: 500,
    data: {
      errorMessages: ['Internal server error'],
    },
  },
};

// Create Meta responses
export const mockJiraCreateMetaField = {
  key: 'summary',
  fieldId: 'summary',
  name: 'Summary',
  required: true,
  schema: {
    type: 'string',
    system: 'summary',
  },
  operations: ['set'],
};

export const mockJiraCreateMetaCustomField = {
  key: 'customfield_10071',
  fieldId: 'customfield_10071',
  name: 'Controlling Category',
  required: true,
  schema: {
    type: 'option',
    custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
    customId: 10071,
  },
  allowedValues: [
    { id: '20010', name: 'Category A', value: 'Category A' },
    { id: '20011', name: 'Category B', value: 'Category B' },
  ],
  operations: ['set'],
};

export const mockJiraCreateMetaIssueTypeFields = {
  values: [mockJiraCreateMetaField, mockJiraCreateMetaCustomField],
};

export const mockJiraCreateMetaResponse = {
  projects: [
    {
      id: 'test-project-id',
      key: 'TEST',
      name: 'Test Project',
      issuetypes: [
        {
          id: 'test-issue-type-id',
          name: 'Bug',
          description: 'A problem which impairs or prevents the functions of the product.',
          iconUrl: 'https://test.atlassian.net/images/icons/issuetypes/bug.png',
          subtask: false,
          fields: {
            summary: mockJiraCreateMetaField,
            customfield_10071: mockJiraCreateMetaCustomField,
          },
        },
      ],
    },
  ],
};

// Attachment responses
export const mockJiraAttachment = {
  id: 'test-attachment-id-123',
  self: 'https://test.atlassian.net/rest/api/3/attachment/test-attachment-id-123',
  filename: 'screenshot.png',
  author: mockJiraUser,
  created: '2023-01-01T12:00:00.000+0000',
  size: 12345,
  mimeType: 'image/png',
  content: 'https://test.atlassian.net/secure/attachment/test-attachment-id-123/screenshot.png',
  thumbnail: 'https://test.atlassian.net/secure/thumbnail/test-attachment-id-123/screenshot.png',
};

export const mockJiraAttachmentList = [
  mockJiraAttachment,
  {
    ...mockJiraAttachment,
    id: 'test-attachment-id-456',
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    size: 54321,
    thumbnail: undefined,
    content: 'https://test.atlassian.net/secure/attachment/test-attachment-id-456/document.pdf',
  },
];
