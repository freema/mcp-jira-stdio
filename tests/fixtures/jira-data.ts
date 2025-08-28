// Sample test data fixtures for Jira API responses

export const sampleJiraProjects = [
  {
    id: '10000',
    key: 'TEST',
    name: 'Test Project',
    description: 'A test project for development',
    lead: {
      accountId: 'user-123',
      displayName: 'John Doe',
      emailAddress: 'john@example.com',
      active: true,
    },
    projectTypeKey: 'software',
    style: 'classic',
    isPrivate: false,
    self: 'https://test.atlassian.net/rest/api/3/project/10000',
  },
  {
    id: '10001',
    key: 'DEMO',
    name: 'Demo Project',
    description: 'Demo project for testing',
    lead: {
      accountId: 'user-456',
      displayName: 'Jane Smith',
      emailAddress: 'jane@example.com',
      active: true,
    },
    projectTypeKey: 'business',
    style: 'next-gen',
    isPrivate: true,
    self: 'https://test.atlassian.net/rest/api/3/project/10001',
  },
];

export const sampleJiraIssues = [
  {
    id: '10100',
    key: 'TEST-1',
    self: 'https://test.atlassian.net/rest/api/3/issue/10100',
    fields: {
      summary: 'Login page not loading',
      description: 'The login page fails to load when accessing the application',
      status: {
        id: '1',
        name: 'Open',
        statusCategory: { key: 'new', name: 'New' },
      },
      priority: {
        id: '2',
        name: 'High',
      },
      issuetype: {
        id: '10001',
        name: 'Bug',
        subtask: false,
      },
      project: sampleJiraProjects[0],
      assignee: {
        accountId: 'user-123',
        displayName: 'John Doe',
        emailAddress: 'john@example.com',
        active: true,
      },
      reporter: {
        accountId: 'user-456',
        displayName: 'Jane Smith',
        emailAddress: 'jane@example.com',
        active: true,
      },
      created: '2023-01-15T10:30:00.000+0000',
      updated: '2023-01-16T14:45:00.000+0000',
      labels: ['urgent', 'frontend'],
      components: [
        { id: '10000', name: 'Authentication' },
        { id: '10001', name: 'UI' },
      ],
    },
  },
  {
    id: '10101',
    key: 'TEST-2',
    self: 'https://test.atlassian.net/rest/api/3/issue/10101',
    fields: {
      summary: 'Add dark mode support',
      description: 'Implement dark mode theme for better user experience',
      status: {
        id: '3',
        name: 'In Progress',
        statusCategory: { key: 'indeterminate', name: 'In Progress' },
      },
      priority: {
        id: '3',
        name: 'Medium',
      },
      issuetype: {
        id: '10002',
        name: 'Story',
        subtask: false,
      },
      project: sampleJiraProjects[0],
      assignee: {
        accountId: 'user-789',
        displayName: 'Bob Wilson',
        emailAddress: 'bob@example.com',
        active: true,
      },
      reporter: {
        accountId: 'user-456',
        displayName: 'Jane Smith',
        emailAddress: 'jane@example.com',
        active: true,
      },
      created: '2023-01-10T09:15:00.000+0000',
      updated: '2023-01-17T11:20:00.000+0000',
      labels: ['enhancement', 'ui'],
      components: [
        { id: '10001', name: 'UI' },
        { id: '10002', name: 'Theme' },
      ],
    },
  },
];

export const sampleJiraUsers = [
  {
    accountId: 'user-123',
    displayName: 'John Doe',
    emailAddress: 'john@example.com',
    active: true,
    accountType: 'atlassian',
    self: 'https://test.atlassian.net/rest/api/3/user?accountId=user-123',
  },
  {
    accountId: 'user-456',
    displayName: 'Jane Smith',
    emailAddress: 'jane@example.com',
    active: true,
    accountType: 'atlassian',
    self: 'https://test.atlassian.net/rest/api/3/user?accountId=user-456',
  },
  {
    accountId: 'user-789',
    displayName: 'Bob Wilson',
    emailAddress: 'bob@example.com',
    active: false,
    accountType: 'app',
    self: 'https://test.atlassian.net/rest/api/3/user?accountId=user-789',
  },
];

export const sampleJiraIssueTypes = [
  {
    id: '10001',
    name: 'Bug',
    description: 'A problem that impairs or prevents the functions of the product.',
    subtask: false,
    iconUrl: 'https://test.atlassian.net/images/icons/issuetypes/bug.png',
    self: 'https://test.atlassian.net/rest/api/3/issuetype/10001',
  },
  {
    id: '10002',
    name: 'Story',
    description: 'A user story. Created by Jira Software.',
    subtask: false,
    iconUrl: 'https://test.atlassian.net/images/icons/issuetypes/story.svg',
    self: 'https://test.atlassian.net/rest/api/3/issuetype/10002',
  },
  {
    id: '10003',
    name: 'Task',
    description: 'A task that needs to be done.',
    subtask: false,
    iconUrl: 'https://test.atlassian.net/images/icons/issuetypes/task.svg',
    self: 'https://test.atlassian.net/rest/api/3/issuetype/10003',
  },
  {
    id: '10004',
    name: 'Sub-task',
    description: 'A subtask of another issue.',
    subtask: true,
    iconUrl: 'https://test.atlassian.net/images/icons/issuetypes/subtask.svg',
    self: 'https://test.atlassian.net/rest/api/3/issuetype/10004',
  },
];

export const sampleJiraPriorities = [
  {
    id: '1',
    name: 'Highest',
    description: 'This problem will block progress.',
    iconUrl: 'https://test.atlassian.net/images/icons/priorities/highest.svg',
    self: 'https://test.atlassian.net/rest/api/3/priority/1',
  },
  {
    id: '2',
    name: 'High',
    description: 'Serious problem that could block progress.',
    iconUrl: 'https://test.atlassian.net/images/icons/priorities/high.svg',
    self: 'https://test.atlassian.net/rest/api/3/priority/2',
  },
  {
    id: '3',
    name: 'Medium',
    description: 'Has the potential to affect progress.',
    iconUrl: 'https://test.atlassian.net/images/icons/priorities/medium.svg',
    self: 'https://test.atlassian.net/rest/api/3/priority/3',
  },
  {
    id: '4',
    name: 'Low',
    description: 'Minor problem or easily worked around.',
    iconUrl: 'https://test.atlassian.net/images/icons/priorities/low.svg',
    self: 'https://test.atlassian.net/rest/api/3/priority/4',
  },
  {
    id: '5',
    name: 'Lowest',
    description: 'Trivial problem with little or no impact on progress.',
    iconUrl: 'https://test.atlassian.net/images/icons/priorities/lowest.svg',
    self: 'https://test.atlassian.net/rest/api/3/priority/5',
  },
];

export const sampleJiraStatuses = [
  {
    id: '1',
    name: 'Open',
    description: 'The issue is open and ready for the assignee to start work on it.',
    statusCategory: {
      id: 2,
      key: 'new',
      colorName: 'blue-gray',
      name: 'New',
    },
    self: 'https://test.atlassian.net/rest/api/3/status/1',
  },
  {
    id: '3',
    name: 'In Progress',
    description: 'This issue is being actively worked on at the moment by the assignee.',
    statusCategory: {
      id: 4,
      key: 'indeterminate',
      colorName: 'yellow',
      name: 'In Progress',
    },
    self: 'https://test.atlassian.net/rest/api/3/status/3',
  },
  {
    id: '4',
    name: 'Reopened',
    description: 'This issue was once resolved, but the resolution was deemed incorrect.',
    statusCategory: {
      id: 2,
      key: 'new',
      colorName: 'blue-gray',
      name: 'New',
    },
    self: 'https://test.atlassian.net/rest/api/3/status/4',
  },
  {
    id: '5',
    name: 'Resolved',
    description: 'A resolution has been taken, and it is awaiting verification by reporter.',
    statusCategory: {
      id: 3,
      key: 'done',
      colorName: 'green',
      name: 'Done',
    },
    self: 'https://test.atlassian.net/rest/api/3/status/5',
  },
  {
    id: '6',
    name: 'Closed',
    description: 'The issue is considered finished, the resolution is correct.',
    statusCategory: {
      id: 3,
      key: 'done',
      colorName: 'green',
      name: 'Done',
    },
    self: 'https://test.atlassian.net/rest/api/3/status/6',
  },
];

export const sampleJiraComments = [
  {
    id: '10000',
    body: 'This is a test comment on the issue.',
    author: sampleJiraUsers[0],
    updateAuthor: sampleJiraUsers[0],
    created: '2023-01-16T10:30:00.000+0000',
    updated: '2023-01-16T10:30:00.000+0000',
    self: 'https://test.atlassian.net/rest/api/3/issue/TEST-1/comment/10000',
  },
  {
    id: '10001',
    body: 'Updated comment with more details.',
    author: sampleJiraUsers[1],
    updateAuthor: sampleJiraUsers[1],
    created: '2023-01-16T14:45:00.000+0000',
    updated: '2023-01-16T15:00:00.000+0000',
    visibility: {
      type: 'group',
      value: 'jira-developers',
    },
    self: 'https://test.atlassian.net/rest/api/3/issue/TEST-1/comment/10001',
  },
];

export const sampleJiraSearchResults = {
  startAt: 0,
  maxResults: 50,
  total: 2,
  isLast: true,
  issues: sampleJiraIssues,
};

export const sampleJQLQueries = [
  'project = "TEST"',
  'assignee = currentUser()',
  'status in ("Open", "In Progress")',
  'priority >= High',
  'created >= -30d',
  'labels in (urgent, bug)',
  'component = "Authentication"',
  'project = "TEST" AND status = "Open" ORDER BY priority DESC',
  'assignee in membersOf("jira-developers") AND updated >= -7d',
  'summary ~ "login" OR description ~ "authentication"',
];

export const sampleErrorResponses = {
  unauthorized: {
    status: 401,
    data: {
      errorMessages: ['You are not authenticated. Authentication required.'],
      errors: {},
    },
  },
  forbidden: {
    status: 403,
    data: {
      errorMessages: ['You do not have permission to access this resource.'],
      errors: {},
    },
  },
  notFound: {
    status: 404,
    data: {
      errorMessages: ['Issue does not exist or you do not have permission to see it.'],
      errors: {},
    },
  },
  rateLimited: {
    status: 429,
    data: {
      errorMessages: ['You have exceeded the maximum number of requests.'],
      errors: {},
    },
  },
  validationError: {
    status: 400,
    data: {
      errorMessages: [],
      errors: {
        summary: 'Summary is required.',
        project: 'Project is required.',
        issuetype: 'Issue type is required.',
      },
    },
  },
  jqlSyntaxError: {
    status: 400,
    data: {
      errorMessages: [
        'Error in the JQL Query: The character \'x\' is a reserved word and cannot be used in field names. (line 1, character 14)',
      ],
      errors: {},
    },
  },
};