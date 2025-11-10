import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeJiraRequest } from '../../../src/utils/jira-auth.js';
import {
  getVisibleProjects,
  getIssue,
  searchIssues,
  createIssue,
  updateIssue,
  getCurrentUser,
  getMyIssues,
  getIssueTypes,
  getUsers,
  getPriorities,
  getStatuses,
  addComment,
  getProjectDetails,
  createSubtask,
  getCreateMeta,
} from '../../../src/utils/api-helpers.js';
import {
  mockJiraProject,
  mockJiraIssue,
  mockJiraSearchResult,
  mockJiraUser,
  mockJiraIssueType,
  mockJiraSubtaskIssueType,
  mockJiraPriority,
  mockJiraStatus,
  mockJiraComment,
  mockJiraProjectDetails,
  mockJiraPaginatedProjects,
  mockJiraCreateIssueResponse,
  mockJiraCreateMetaResponse,
  mockJiraCreateMetaIssueTypeFields,
} from '../../mocks/jira-responses.js';

// Mock the jira-auth module
vi.mock('../../../src/utils/jira-auth.js');
const mockedMakeJiraRequest = vi.mocked(makeJiraRequest);

describe('api-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVisibleProjects', () => {
    it('should fetch projects without options', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraPaginatedProjects);

      const result = await getVisibleProjects();

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/project/search',
        params: { startAt: 0, maxResults: 50 },
      });
      expect(result).toEqual([mockJiraProject]);
    });

    it('should fetch projects with expand options', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraPaginatedProjects);

      await getVisibleProjects({ expand: ['lead', 'description'] });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/project/search',
        params: { startAt: 0, maxResults: 50, expand: 'lead,description' },
      });
    });

    it('should fetch recent projects', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraPaginatedProjects);

      await getVisibleProjects({ recent: 5 });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/project/search',
        params: { startAt: 0, maxResults: 50, recent: 5 },
      });
    });

    it('should fetch projects with both expand and recent options', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraPaginatedProjects);

      await getVisibleProjects({ expand: ['lead'], recent: 3 });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/project/search',
        params: { startAt: 0, maxResults: 50, expand: 'lead', recent: 3 },
      });
    });

    it('should fetch all pages when pagination is needed', async () => {
      const page1 = {
        startAt: 0,
        maxResults: 50,
        total: 75,
        isLast: false,
        values: [mockJiraProject],
      };
      const page2 = {
        startAt: 50,
        maxResults: 50,
        total: 75,
        isLast: true,
        values: [{ ...mockJiraProject, key: 'TEST2', id: '10001' }],
      };

      mockedMakeJiraRequest.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

      const result = await getVisibleProjects();

      expect(mockedMakeJiraRequest).toHaveBeenCalledTimes(2);
      expect(mockedMakeJiraRequest).toHaveBeenNthCalledWith(1, {
        method: 'GET',
        url: '/project/search',
        params: { startAt: 0, maxResults: 50 },
      });
      expect(mockedMakeJiraRequest).toHaveBeenNthCalledWith(2, {
        method: 'GET',
        url: '/project/search',
        params: { startAt: 50, maxResults: 50 },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockJiraProject);
      expect(result[1]).toEqual({ ...mockJiraProject, key: 'TEST2', id: '10001' });
    });
  });

  describe('getIssue', () => {
    it('should fetch issue without options', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraIssue);

      const result = await getIssue('TEST-123');

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issue/TEST-123',
        params: {},
      });
      expect(result).toEqual(mockJiraIssue);
    });

    it('should fetch issue with expand options', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraIssue);

      await getIssue('TEST-123', { expand: ['comments', 'attachments'] });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issue/TEST-123',
        params: { expand: 'comments,attachments' },
      });
    });

    it('should fetch issue with specific fields', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraIssue);

      await getIssue('TEST-123', { fields: ['summary', 'status'] });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issue/TEST-123',
        params: { fields: 'summary,status' },
      });
    });

    it('should fetch issue with both expand and fields', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraIssue);

      await getIssue('TEST-123', {
        expand: ['comments'],
        fields: ['summary', 'status'],
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issue/TEST-123',
        params: {
          expand: 'comments',
          fields: 'summary,status',
        },
      });
    });
  });

  describe('searchIssues', () => {
    it('should search issues with basic JQL', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraSearchResult);

      const result = await searchIssues({ jql: 'project = TEST' });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/search/jql',
        data: {
          jql: 'project = TEST',
          maxResults: 50,
        },
      });
      expect(result).toEqual(mockJiraSearchResult);
    });

    it('should search issues with pagination token', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraSearchResult);

      await searchIssues({
        jql: 'project = TEST',
        nextPageToken: 'token-abc-123',
        maxResults: 10,
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/search/jql',
        data: {
          jql: 'project = TEST',
          nextPageToken: 'token-abc-123',
          maxResults: 10,
        },
      });
    });

    it('should search issues with fields and expand', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraSearchResult);

      await searchIssues({
        jql: 'project = TEST',
        fields: ['summary', 'status'],
        expand: ['changelog'],
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/search/jql',
        data: {
          jql: 'project = TEST',
          maxResults: 50,
          fields: ['summary', 'status'],
          expand: ['changelog'],
        },
      });
    });

    it('should sanitize dangerous JQL characters', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraSearchResult);

      await searchIssues({ jql: 'summary ~ "test<script>"' });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/search/jql',
        data: {
          jql: 'summary ~ testscript',
          maxResults: 50,
        },
      });
    });
  });

  describe('createIssue', () => {
    it('should create issue with required fields only', async () => {
      mockedMakeJiraRequest
        .mockResolvedValueOnce(mockJiraCreateIssueResponse)
        .mockResolvedValueOnce(mockJiraIssue);

      const issueData = {
        projectKey: 'TEST',
        summary: 'Test issue',
        issueType: 'Bug',
      };

      const result = await createIssue(issueData);

      expect(mockedMakeJiraRequest).toHaveBeenNthCalledWith(1, {
        method: 'POST',
        url: '/issue',
        data: {
          fields: {
            project: { key: 'TEST' },
            summary: 'Test issue',
            issuetype: { name: 'Bug' },
          },
        },
      });
      expect(mockedMakeJiraRequest).toHaveBeenNthCalledWith(2, {
        method: 'GET',
        url: '/issue/TEST-123',
        params: {},
      });
      expect(result).toEqual(mockJiraIssue);
    });

    it('should create issue with all optional fields', async () => {
      mockedMakeJiraRequest
        .mockResolvedValueOnce(mockJiraCreateIssueResponse)
        .mockResolvedValueOnce(mockJiraIssue);

      const issueData = {
        projectKey: 'TEST',
        summary: 'Test issue',
        description: 'Test description',
        issueType: 'Bug',
        priority: 'High',
        assignee: 'user-id-123',
        labels: ['bug', 'urgent'],
        components: ['Frontend', 'Backend'],
        format: 'plain' as const,
      };

      await createIssue(issueData);

      const firstCall = mockedMakeJiraRequest.mock.calls[0][0];
      expect(firstCall).toMatchObject({
        method: 'POST',
        url: '/issue',
      });
      expect(firstCall.data.fields).toMatchObject({
        project: { key: 'TEST' },
        summary: 'Test issue',
        issuetype: { name: 'Bug' },
        priority: { name: 'High' },
        assignee: { accountId: 'user-id-123' },
        labels: ['bug', 'urgent'],
        components: [{ name: 'Frontend' }, { name: 'Backend' }],
      });
      expect(firstCall.data.fields.description).toMatchObject({ type: 'doc', version: 1 });
    });

    it('should handle empty arrays for labels and components', async () => {
      mockedMakeJiraRequest
        .mockResolvedValueOnce(mockJiraCreateIssueResponse)
        .mockResolvedValueOnce(mockJiraIssue);

      const issueData = {
        projectKey: 'TEST',
        summary: 'Test issue',
        issueType: 'Bug',
        labels: [],
        components: [],
      };

      await createIssue(issueData);

      const callData = mockedMakeJiraRequest.mock.calls[0][0].data;
      expect(callData.fields.labels).toBeUndefined();
      expect(callData.fields.components).toBeUndefined();
    });

    it('should pass through customFields into payload', async () => {
      mockedMakeJiraRequest
        .mockResolvedValueOnce(mockJiraCreateIssueResponse)
        .mockResolvedValueOnce(mockJiraIssue);

      const issueData = {
        projectKey: 'TEST',
        summary: 'Test issue',
        issueType: 'Task',
        customFields: {
          customfield_10071: { id: '20010' },
          customfield_12345: 'some value',
        },
      } as any;

      await createIssue(issueData);

      const firstCall = mockedMakeJiraRequest.mock.calls[0][0];
      expect(firstCall).toMatchObject({ method: 'POST', url: '/issue' });
      expect(firstCall.data.fields.customfield_10071).toEqual({ id: '20010' });
      expect(firstCall.data.fields.customfield_12345).toEqual('some value');
      // Ensure standard fields preserved
      expect(firstCall.data.fields.summary).toBe('Test issue');
      expect(firstCall.data.fields.issuetype).toEqual({ name: 'Task' });
    });
  });

  describe('updateIssue', () => {
    it('should update issue with provided fields', async () => {
      mockedMakeJiraRequest.mockResolvedValue(undefined);

      const updates = {
        summary: 'Updated summary',
        description: 'Updated description',
        priority: 'Low',
        format: 'plain' as const,
      };

      await updateIssue('TEST-123', updates);

      const call = mockedMakeJiraRequest.mock.calls[0][0];
      expect(call).toMatchObject({ method: 'PUT', url: '/issue/TEST-123' });
      expect(call.data.fields.summary).toBe('Updated summary');
      expect(call.data.fields.priority).toEqual({ name: 'Low' });
      expect(call.data.fields.description).toMatchObject({ type: 'doc', version: 1 });
    });

    it('should handle assignee updates', async () => {
      mockedMakeJiraRequest.mockResolvedValue(undefined);

      await updateIssue('TEST-123', { assignee: 'new-user-id' });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/issue/TEST-123',
        data: {
          fields: {
            assignee: { accountId: 'new-user-id' },
          },
        },
      });
    });

    it('should handle assignee removal', async () => {
      mockedMakeJiraRequest.mockResolvedValue(undefined);

      await updateIssue('TEST-123', { assignee: '' });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/issue/TEST-123',
        data: {
          fields: {
            assignee: null,
          },
        },
      });
    });

    it('should handle labels and components updates', async () => {
      mockedMakeJiraRequest.mockResolvedValue(undefined);

      await updateIssue('TEST-123', {
        labels: ['new-label'],
        components: ['New Component'],
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/issue/TEST-123',
        data: {
          fields: {
            labels: ['new-label'],
            components: [{ name: 'New Component' }],
          },
        },
      });
    });

    it('should only include defined fields in update', async () => {
      mockedMakeJiraRequest.mockResolvedValue(undefined);

      await updateIssue('TEST-123', { summary: 'New summary' });

      const callData = mockedMakeJiraRequest.mock.calls[0][0].data;
      expect(callData.fields).toEqual({
        summary: 'New summary',
      });
      expect(callData.fields.description).toBeUndefined();
      expect(callData.fields.priority).toBeUndefined();
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraUser);

      const result = await getCurrentUser();

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/myself',
      });
      expect(result).toEqual(mockJiraUser);
    });
  });

  describe('getMyIssues', () => {
    it("should fetch current user's issues using currentUser() JQL", async () => {
      mockedMakeJiraRequest.mockResolvedValueOnce(mockJiraSearchResult);

      const result = await getMyIssues();

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/search/jql',
        data: {
          jql: 'assignee = currentUser() ORDER BY updated DESC',
          maxResults: 50,
        },
      });
      expect(result).toEqual(mockJiraSearchResult);
    });

    it('should fetch my issues with options', async () => {
      mockedMakeJiraRequest.mockResolvedValueOnce(mockJiraSearchResult);

      await getMyIssues({
        nextPageToken: 'token-def-456',
        maxResults: 25,
        fields: ['summary'],
        expand: ['comments'],
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/search/jql',
        data: {
          jql: 'assignee = currentUser() ORDER BY updated DESC',
          nextPageToken: 'token-def-456',
          maxResults: 25,
          fields: ['summary'],
          expand: ['comments'],
        },
      });
    });
  });

  describe('getIssueTypes', () => {
    it('should fetch global issue types', async () => {
      const issueTypes = [mockJiraIssueType];
      mockedMakeJiraRequest.mockResolvedValue(issueTypes);

      const result = await getIssueTypes();

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issuetype',
      });
      expect(result).toEqual(issueTypes);
    });

    it('should fetch project-specific issue types', async () => {
      const issueTypes = [mockJiraIssueType];
      mockedMakeJiraRequest.mockResolvedValue(issueTypes);

      const result = await getIssueTypes('TEST');

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/project/TEST/issuetype',
      });
      expect(result).toEqual(issueTypes);
    });
  });

  describe('getUsers', () => {
    it('should search users without options', async () => {
      const users = [mockJiraUser];
      mockedMakeJiraRequest.mockResolvedValue(users);

      const result = await getUsers();

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/user/search',
        params: {},
      });
      expect(result).toEqual(users);
    });

    it('should search users with query', async () => {
      const users = [mockJiraUser];
      mockedMakeJiraRequest.mockResolvedValue(users);

      await getUsers({ query: 'john' });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/user/search',
        params: { query: 'john' },
      });
    });

    it('should search users with all options', async () => {
      const users = [mockJiraUser];
      mockedMakeJiraRequest.mockResolvedValue(users);

      await getUsers({
        query: 'john',
        username: 'john.doe',
        accountId: 'account-123',
        startAt: 10,
        maxResults: 25,
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/user/search',
        params: {
          query: 'john',
          username: 'john.doe',
          accountId: 'account-123',
          startAt: 10,
          maxResults: 25,
        },
      });
    });
  });

  describe('getPriorities', () => {
    it('should fetch priorities', async () => {
      const priorities = [mockJiraPriority];
      mockedMakeJiraRequest.mockResolvedValue(priorities);

      const result = await getPriorities();

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/priority',
      });
      expect(result).toEqual(priorities);
    });
  });

  describe('getStatuses', () => {
    it('should fetch global statuses', async () => {
      const statuses = [mockJiraStatus];
      mockedMakeJiraRequest.mockResolvedValue(statuses);

      const result = await getStatuses();

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/status',
      });
      expect(result).toEqual(statuses);
    });

    it('should fetch project-specific statuses', async () => {
      const response = [{ name: 'Bug', statuses: [mockJiraStatus] }];
      mockedMakeJiraRequest.mockResolvedValue(response);

      const result = await getStatuses({ projectKey: 'TEST' });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/project/TEST/statuses',
      });
      expect(result).toEqual([mockJiraStatus]);
    });

    it('should fetch statuses for project and issue type', async () => {
      const response = [{ name: 'Bug', statuses: [mockJiraStatus] }];
      mockedMakeJiraRequest.mockResolvedValue(response);

      await getStatuses({ projectKey: 'TEST', issueTypeId: 'bug-id' });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/project/TEST/statuses',
      });
    });
  });

  describe('addComment', () => {
    it('should add comment without visibility', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraComment);

      const result = await addComment('TEST-123', 'This is a comment', undefined, 'plain');

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/issue/TEST-123/comment',
        data: {
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'This is a comment' }],
              },
            ],
          },
        },
      });
      expect(result).toEqual(mockJiraComment);
    });

    it('should add comment with visibility', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraComment);

      const visibility = { type: 'group', value: 'jira-developers' };
      await addComment('TEST-123', 'Private comment', visibility, 'plain');

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/issue/TEST-123/comment',
        data: {
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Private comment' }],
              },
            ],
          },
          visibility: { type: 'group', value: 'jira-developers' },
        },
      });
    });
  });

  describe('getProjectDetails', () => {
    it('should fetch project details without expand', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraProjectDetails);

      const result = await getProjectDetails('TEST');

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/project/TEST',
        params: {},
      });
      expect(result).toEqual(mockJiraProjectDetails);
    });

    it('should fetch project details with expand', async () => {
      mockedMakeJiraRequest.mockResolvedValue(mockJiraProjectDetails);

      await getProjectDetails('TEST', ['lead', 'description']);

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/project/TEST',
        params: { expand: 'lead,description' },
      });
    });
  });

  describe('createSubtask', () => {
    it('should create subtask with required fields', async () => {
      mockedMakeJiraRequest
        .mockResolvedValueOnce(mockJiraIssue) // getIssue for parent
        .mockResolvedValueOnce([mockJiraIssueType, mockJiraSubtaskIssueType]) // getIssueTypes
        .mockResolvedValueOnce(mockJiraCreateIssueResponse) // createIssue
        .mockResolvedValueOnce(mockJiraIssue); // getIssue for created subtask

      const subtaskData = {
        summary: 'Test subtask',
      };

      const result = await createSubtask('TEST-123', subtaskData);

      expect(mockedMakeJiraRequest).toHaveBeenNthCalledWith(1, {
        method: 'GET',
        url: '/issue/TEST-123',
        params: {},
      });
      expect(mockedMakeJiraRequest).toHaveBeenNthCalledWith(2, {
        method: 'GET',
        url: '/project/TEST/issuetype',
      });
      expect(mockedMakeJiraRequest).toHaveBeenNthCalledWith(3, {
        method: 'POST',
        url: '/issue',
        data: {
          fields: {
            project: { key: 'TEST' },
            parent: { key: 'TEST-123' },
            summary: 'Test subtask',
            issuetype: { id: 'subtask-issue-type-id' },
          },
        },
      });
      expect(result).toEqual(mockJiraIssue);
    });

    it('should create subtask with all optional fields', async () => {
      mockedMakeJiraRequest
        .mockResolvedValueOnce(mockJiraIssue)
        .mockResolvedValueOnce([mockJiraSubtaskIssueType])
        .mockResolvedValueOnce(mockJiraCreateIssueResponse)
        .mockResolvedValueOnce(mockJiraIssue);

      const subtaskData = {
        summary: 'Test subtask',
        description: 'Subtask description',
        priority: 'High',
        assignee: 'user-123',
        labels: ['subtask'],
        components: ['Frontend'],
        format: 'plain' as const,
      };

      await createSubtask('TEST-123', subtaskData);

      const thirdCall = mockedMakeJiraRequest.mock.calls[2][0];
      expect(thirdCall).toMatchObject({ method: 'POST', url: '/issue' });
      expect(thirdCall.data.fields).toMatchObject({
        project: { key: 'TEST' },
        parent: { key: 'TEST-123' },
        summary: 'Test subtask',
        issuetype: { id: 'subtask-issue-type-id' },
        priority: { name: 'High' },
        assignee: { accountId: 'user-123' },
        labels: ['subtask'],
        components: [{ name: 'Frontend' }],
      });
      expect(thirdCall.data.fields.description).toMatchObject({ type: 'doc', version: 1 });
    });

    it('should throw error when no subtask issue type found', async () => {
      mockedMakeJiraRequest
        .mockResolvedValueOnce(mockJiraIssue)
        .mockResolvedValueOnce([mockJiraIssueType]); // no subtask type

      const subtaskData = { summary: 'Test subtask' };

      await expect(createSubtask('TEST-123', subtaskData)).rejects.toThrow(
        'No subtask issue type found for project TEST'
      );
    });

    it('should handle empty arrays for labels and components', async () => {
      mockedMakeJiraRequest
        .mockResolvedValueOnce(mockJiraIssue)
        .mockResolvedValueOnce([mockJiraSubtaskIssueType])
        .mockResolvedValueOnce(mockJiraCreateIssueResponse)
        .mockResolvedValueOnce(mockJiraIssue);

      const subtaskData = {
        summary: 'Test subtask',
        labels: [],
        components: [],
      };

      await createSubtask('TEST-123', subtaskData);

      const callData = mockedMakeJiraRequest.mock.calls[2][0].data;
      expect(callData.fields.labels).toBeUndefined();
      expect(callData.fields.components).toBeUndefined();
    });
  });

  describe('getCreateMeta', () => {
    it('should fetch metadata for single project', async () => {
      mockedMakeJiraRequest.mockResolvedValueOnce(mockJiraCreateMetaResponse);

      const result = await getCreateMeta({
        projectKeys: ['TEST'],
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issue/createmeta',
        params: {
          projectKeys: 'TEST',
        },
      });
      expect(result).toEqual(mockJiraCreateMetaResponse);
    });

    it('should fetch metadata with issue type filter', async () => {
      mockedMakeJiraRequest.mockResolvedValueOnce(mockJiraCreateMetaResponse);

      const result = await getCreateMeta({
        projectKeys: ['TEST'],
        issueTypeNames: ['Bug'],
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issue/createmeta',
        params: {
          projectKeys: 'TEST',
          issuetypeNames: 'Bug',
        },
      });
      expect(result).toEqual(mockJiraCreateMetaResponse);
    });

    it('should fetch metadata for multiple projects', async () => {
      mockedMakeJiraRequest.mockResolvedValueOnce(mockJiraCreateMetaResponse);

      const result = await getCreateMeta({
        projectKeys: ['TEST', 'PROJ2'],
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issue/createmeta',
        params: {
          projectKeys: 'TEST,PROJ2',
        },
      });
      expect(result).toEqual(mockJiraCreateMetaResponse);
    });

    it('should fetch metadata when no project keys provided', async () => {
      mockedMakeJiraRequest.mockResolvedValueOnce(mockJiraCreateMetaResponse);

      const result = await getCreateMeta();

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issue/createmeta',
        params: {},
      });
      expect(result).toEqual(mockJiraCreateMetaResponse);
    });

    it('should pass expand parameter to get full field metadata', async () => {
      mockedMakeJiraRequest.mockResolvedValueOnce(mockJiraCreateMetaResponse);

      await getCreateMeta({
        projectKeys: ['TEST'],
        expand: 'projects.issuetypes.fields',
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issue/createmeta',
        params: {
          projectKeys: 'TEST',
          expand: 'projects.issuetypes.fields',
        },
      });
    });

    it('should handle multiple issue types', async () => {
      mockedMakeJiraRequest.mockResolvedValueOnce(mockJiraCreateMetaResponse);

      await getCreateMeta({
        projectKeys: ['TEST'],
        issueTypeNames: ['Bug', 'Task'],
      });

      expect(mockedMakeJiraRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/issue/createmeta',
        params: {
          projectKeys: 'TEST',
          issuetypeNames: 'Bug,Task',
        },
      });
    });
  });
});
