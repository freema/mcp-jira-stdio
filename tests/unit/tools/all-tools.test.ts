import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  handleGetVisibleProjects, getVisibleProjectsTool,
  handleGetMyIssues, getMyIssuesTool,
  handleUpdateIssue, updateIssueTool,
  handleAddComment, addCommentTool,
  handleGetIssueTypes, getIssueTypesTool,
  handleGetUsers, getUsersTool,
  handleGetPriorities, getPrioritiesTool,
  handleGetStatuses, getStatusesTool,
  handleGetProjectInfo, getProjectInfoTool,
  handleCreateSubtask, createSubtaskTool
} from '../../../src/tools/index.js';
import { validateInput } from '../../../src/utils/validators.js';
import { 
  getVisibleProjects, 
  getMyIssues, 
  updateIssue, 
  addComment,
  getIssueTypes,
  getUsers,
  getPriorities,
  getStatuses,
  getProjectDetails,
  createSubtask
} from '../../../src/utils/api-helpers.js';
import { 
  formatProjectsResponse,
  formatSearchResultsResponse,
  formatSuccessResponse,
  formatCommentResponse,
  formatIssueTypesResponse,
  formatUsersResponse,
  formatPrioritiesResponse,
  formatStatusesResponse,
  formatProjectDetailsResponse,
  formatIssueResponse
} from '../../../src/utils/formatters.js';
import { handleError } from '../../../src/utils/error-handler.js';
import { 
  mockJiraProject, 
  mockJiraSearchResult,
  mockJiraComment,
  mockJiraIssueType,
  mockJiraUser,
  mockJiraPriority,
  mockJiraStatus,
  mockJiraProjectDetails,
  mockJiraIssue,
  mockUnauthorizedError,
  mockNotFoundError
} from '../../mocks/jira-responses.js';
import { TOOL_NAMES } from '../../../src/config/constants.js';

// Mock all dependencies
vi.mock('../../../src/utils/validators.js');
vi.mock('../../../src/utils/api-helpers.js');
vi.mock('../../../src/utils/formatters.js');
vi.mock('../../../src/utils/error-handler.js');

const mockedValidateInput = vi.mocked(validateInput);
const mockedGetVisibleProjects = vi.mocked(getVisibleProjects);
const mockedGetMyIssues = vi.mocked(getMyIssues);
const mockedUpdateIssue = vi.mocked(updateIssue);
const mockedAddComment = vi.mocked(addComment);
const mockedGetIssueTypes = vi.mocked(getIssueTypes);
const mockedGetUsers = vi.mocked(getUsers);
const mockedGetPriorities = vi.mocked(getPriorities);
const mockedGetStatuses = vi.mocked(getStatuses);
const mockedGetProjectDetails = vi.mocked(getProjectDetails);
const mockedCreateSubtask = vi.mocked(createSubtask);

const mockedFormatProjectsResponse = vi.mocked(formatProjectsResponse);
const mockedFormatSearchResultsResponse = vi.mocked(formatSearchResultsResponse);
const mockedFormatSuccessResponse = vi.mocked(formatSuccessResponse);
const mockedFormatCommentResponse = vi.mocked(formatCommentResponse);
const mockedFormatIssueTypesResponse = vi.mocked(formatIssueTypesResponse);
const mockedFormatUsersResponse = vi.mocked(formatUsersResponse);
const mockedFormatPrioritiesResponse = vi.mocked(formatPrioritiesResponse);
const mockedFormatStatusesResponse = vi.mocked(formatStatusesResponse);
const mockedFormatProjectDetailsResponse = vi.mocked(formatProjectDetailsResponse);
const mockedFormatIssueResponse = vi.mocked(formatIssueResponse);
const mockedHandleError = vi.mocked(handleError);

describe('All Jira Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Get Visible Projects Tool', () => {
    it('should have correct configuration', () => {
      expect(getVisibleProjectsTool.name).toBe(TOOL_NAMES.GET_VISIBLE_PROJECTS);
      expect(getVisibleProjectsTool.description).toContain('Retrieves all projects');
    });

    it('should handle successful project retrieval', async () => {
      const input = {};
      const mockResponse = { content: [{ type: 'text', text: 'projects' }] };

      mockedValidateInput.mockReturnValue({});
      mockedGetVisibleProjects.mockResolvedValue([mockJiraProject]);
      mockedFormatProjectsResponse.mockReturnValue(mockResponse);

      const result = await handleGetVisibleProjects(input);

      expect(mockedGetVisibleProjects).toHaveBeenCalledWith({});
      expect(mockedFormatProjectsResponse).toHaveBeenCalledWith([mockJiraProject]);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors', async () => {
      const mockErrorResponse = { content: [{ type: 'text', text: 'error' }] };
      
      mockedValidateInput.mockReturnValue({});
      mockedGetVisibleProjects.mockRejectedValue(mockUnauthorizedError);
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleGetVisibleProjects({});

      expect(mockedHandleError).toHaveBeenCalledWith(mockUnauthorizedError);
      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('Get My Issues Tool', () => {
    it('should have correct configuration', () => {
      expect(getMyIssuesTool.name).toBe(TOOL_NAMES.GET_MY_ISSUES);
      expect(getMyIssuesTool.description).toContain('Retrieves issues assigned to current user');
    });

    it('should handle successful my issues retrieval', async () => {
      const input = { startAt: 0, maxResults: 25 };
      const mockResponse = { content: [{ type: 'text', text: 'my issues' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedGetMyIssues.mockResolvedValue(mockJiraSearchResult);
      mockedFormatSearchResultsResponse.mockReturnValue(mockResponse);

      const result = await handleGetMyIssues(input);

      expect(mockedGetMyIssues).toHaveBeenCalledWith(input);
      expect(mockedFormatSearchResultsResponse).toHaveBeenCalledWith(mockJiraSearchResult);
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Invalid maxResults');
      const mockErrorResponse = { content: [{ type: 'text', text: 'validation error' }] };

      mockedValidateInput.mockImplementation(() => { throw validationError; });
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleGetMyIssues({ maxResults: 101 });

      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('Update Issue Tool', () => {
    it('should have correct configuration', () => {
      expect(updateIssueTool.name).toBe(TOOL_NAMES.UPDATE_ISSUE);
      expect(updateIssueTool.description).toContain('Updates an existing Jira issue');
      expect(updateIssueTool.inputSchema.required).toEqual(['issueKey']);
    });

    it('should handle successful issue update', async () => {
      const input = { 
        issueKey: 'TEST-123', 
        summary: 'Updated summary',
        priority: 'High'
      };
      const mockResponse = { content: [{ type: 'text', text: 'success' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedUpdateIssue.mockResolvedValue(undefined);
      mockedFormatSuccessResponse.mockReturnValue(mockResponse);

      const result = await handleUpdateIssue(input);

      expect(mockedUpdateIssue).toHaveBeenCalledWith('TEST-123', {
        summary: 'Updated summary',
        priority: 'High'
      });
      expect(mockedFormatSuccessResponse).toHaveBeenCalledWith('Issue TEST-123 updated successfully');
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const mockErrorResponse = { content: [{ type: 'text', text: 'api error' }] };

      mockedValidateInput.mockReturnValue({ issueKey: 'TEST-123' });
      mockedUpdateIssue.mockRejectedValue(mockNotFoundError);
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleUpdateIssue({ issueKey: 'TEST-123' });

      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('Add Comment Tool', () => {
    it('should have correct configuration', () => {
      expect(addCommentTool.name).toBe(TOOL_NAMES.ADD_COMMENT);
      expect(addCommentTool.description).toContain('Adds a comment to an issue');
      expect(addCommentTool.inputSchema.required).toEqual(['issueKey', 'body']);
    });

    it('should handle successful comment addition', async () => {
      const input = { 
        issueKey: 'TEST-123', 
        body: 'This is a comment'
      };
      const mockResponse = { content: [{ type: 'text', text: 'comment added' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedAddComment.mockResolvedValue(mockJiraComment);
      mockedFormatCommentResponse.mockReturnValue(mockResponse);

      const result = await handleAddComment(input);

      expect(mockedAddComment).toHaveBeenCalledWith('TEST-123', 'This is a comment', undefined);
      expect(mockedFormatCommentResponse).toHaveBeenCalledWith(mockJiraComment);
      expect(result).toEqual(mockResponse);
    });

    it('should handle comment with visibility', async () => {
      const input = { 
        issueKey: 'TEST-123', 
        body: 'Private comment',
        visibility: { type: 'group', value: 'jira-developers' }
      };

      mockedValidateInput.mockReturnValue(input);
      mockedAddComment.mockResolvedValue(mockJiraComment);
      mockedFormatCommentResponse.mockReturnValue({ content: [] });

      await handleAddComment(input);

      expect(mockedAddComment).toHaveBeenCalledWith(
        'TEST-123', 
        'Private comment',
        { type: 'group', value: 'jira-developers' }
      );
    });
  });

  describe('Get Issue Types Tool', () => {
    it('should have correct configuration', () => {
      expect(getIssueTypesTool.name).toBe(TOOL_NAMES.GET_ISSUE_TYPES);
      expect(getIssueTypesTool.description).toContain('Retrieves available issue types');
    });

    it('should handle global issue types retrieval', async () => {
      const input = {};
      const mockResponse = { content: [{ type: 'text', text: 'issue types' }] };

      mockedValidateInput.mockReturnValue({});
      mockedGetIssueTypes.mockResolvedValue([mockJiraIssueType]);
      mockedFormatIssueTypesResponse.mockReturnValue(mockResponse);

      const result = await handleGetIssueTypes(input);

      expect(mockedGetIssueTypes).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should handle project-specific issue types', async () => {
      const input = { projectKey: 'TEST' };

      mockedValidateInput.mockReturnValue(input);
      mockedGetIssueTypes.mockResolvedValue([mockJiraIssueType]);
      mockedFormatIssueTypesResponse.mockReturnValue({ content: [] });

      await handleGetIssueTypes(input);

      expect(mockedGetIssueTypes).toHaveBeenCalledWith('TEST');
    });
  });

  describe('Get Users Tool', () => {
    it('should have correct configuration', () => {
      expect(getUsersTool.name).toBe(TOOL_NAMES.GET_USERS);
      expect(getUsersTool.description).toContain('Search for users');
    });

    it('should handle user search', async () => {
      const input = { query: 'john' };
      const mockResponse = { content: [{ type: 'text', text: 'users' }] };

      mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
      mockedGetUsers.mockResolvedValue([mockJiraUser]);
      mockedFormatUsersResponse.mockReturnValue(mockResponse);

      const result = await handleGetUsers(input);

      expect(mockedGetUsers).toHaveBeenCalledWith({
        query: 'john',
        startAt: 0,
        maxResults: 50
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Get Priorities Tool', () => {
    it('should have correct configuration', () => {
      expect(getPrioritiesTool.name).toBe(TOOL_NAMES.GET_PRIORITIES);
      expect(getPrioritiesTool.description).toContain('Retrieves available priorities');
    });

    it('should handle priorities retrieval', async () => {
      const mockResponse = { content: [{ type: 'text', text: 'priorities' }] };

      mockedValidateInput.mockReturnValue({});
      mockedGetPriorities.mockResolvedValue([mockJiraPriority]);
      mockedFormatPrioritiesResponse.mockReturnValue(mockResponse);

      const result = await handleGetPriorities({});

      expect(mockedGetPriorities).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Get Statuses Tool', () => {
    it('should have correct configuration', () => {
      expect(getStatusesTool.name).toBe(TOOL_NAMES.GET_STATUSES);
      expect(getStatusesTool.description).toContain('Retrieves available statuses');
    });

    it('should handle statuses retrieval', async () => {
      const input = { projectKey: 'TEST' };
      const mockResponse = { content: [{ type: 'text', text: 'statuses' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedGetStatuses.mockResolvedValue([mockJiraStatus]);
      mockedFormatStatusesResponse.mockReturnValue(mockResponse);

      const result = await handleGetStatuses(input);

      expect(mockedGetStatuses).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Get Project Info Tool', () => {
    it('should have correct configuration', () => {
      expect(getProjectInfoTool.name).toBe(TOOL_NAMES.GET_PROJECT_INFO);
      expect(getProjectInfoTool.description).toContain('Retrieves detailed information about a project');
      expect(getProjectInfoTool.inputSchema.required).toEqual(['projectKey']);
    });

    it('should handle project info retrieval', async () => {
      const input = { projectKey: 'TEST' };
      const mockResponse = { content: [{ type: 'text', text: 'project info' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedGetProjectDetails.mockResolvedValue(mockJiraProjectDetails);
      mockedFormatProjectDetailsResponse.mockReturnValue(mockResponse);

      const result = await handleGetProjectInfo(input);

      expect(mockedGetProjectDetails).toHaveBeenCalledWith('TEST', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should handle project info with expand', async () => {
      const input = { 
        projectKey: 'TEST', 
        expand: ['lead', 'description'] 
      };

      mockedValidateInput.mockReturnValue(input);
      mockedGetProjectDetails.mockResolvedValue(mockJiraProjectDetails);
      mockedFormatProjectDetailsResponse.mockReturnValue({ content: [] });

      await handleGetProjectInfo(input);

      expect(mockedGetProjectDetails).toHaveBeenCalledWith('TEST', ['lead', 'description']);
    });
  });

  describe('Create Subtask Tool', () => {
    it('should have correct configuration', () => {
      expect(createSubtaskTool.name).toBe(TOOL_NAMES.CREATE_SUBTASK);
      expect(createSubtaskTool.description).toContain('Creates a subtask');
      expect(createSubtaskTool.inputSchema.required).toEqual(['parentIssueKey', 'summary']);
    });

    it('should handle subtask creation', async () => {
      const input = { 
        parentIssueKey: 'TEST-123', 
        summary: 'New subtask'
      };
      const mockResponse = { content: [{ type: 'text', text: 'subtask created' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedCreateSubtask.mockResolvedValue(mockJiraIssue);
      mockedFormatIssueResponse.mockReturnValue(mockResponse);

      const result = await handleCreateSubtask(input);

      expect(mockedCreateSubtask).toHaveBeenCalledWith('TEST-123', {
        summary: 'New subtask'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle subtask creation with all fields', async () => {
      const input = { 
        parentIssueKey: 'TEST-123', 
        summary: 'New subtask',
        description: 'Subtask description',
        priority: 'High',
        assignee: 'user-123',
        labels: ['subtask'],
        components: ['Frontend']
      };

      mockedValidateInput.mockReturnValue(input);
      mockedCreateSubtask.mockResolvedValue(mockJiraIssue);
      mockedFormatIssueResponse.mockReturnValue({ content: [] });

      await handleCreateSubtask(input);

      expect(mockedCreateSubtask).toHaveBeenCalledWith('TEST-123', {
        summary: 'New subtask',
        description: 'Subtask description',
        priority: 'High',
        assignee: 'user-123',
        labels: ['subtask'],
        components: ['Frontend']
      });
    });

    it('should handle errors in subtask creation', async () => {
      const error = new Error('No subtask issue type found');
      const mockErrorResponse = { content: [{ type: 'text', text: 'error' }] };

      mockedValidateInput.mockReturnValue({ parentIssueKey: 'TEST-123', summary: 'Test' });
      mockedCreateSubtask.mockRejectedValue(error);
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleCreateSubtask({ parentIssueKey: 'TEST-123', summary: 'Test' });

      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('Error Handling for All Tools', () => {
    const tools = [
      { handler: handleGetVisibleProjects, name: 'Get Visible Projects' },
      { handler: handleGetMyIssues, name: 'Get My Issues' },
      { handler: handleUpdateIssue, name: 'Update Issue' },
      { handler: handleAddComment, name: 'Add Comment' },
      { handler: handleGetIssueTypes, name: 'Get Issue Types' },
      { handler: handleGetUsers, name: 'Get Users' },
      { handler: handleGetPriorities, name: 'Get Priorities' },
      { handler: handleGetStatuses, name: 'Get Statuses' },
      { handler: handleGetProjectInfo, name: 'Get Project Info' },
      { handler: handleCreateSubtask, name: 'Create Subtask' }
    ];

    tools.forEach(({ handler, name }) => {
      it(`should handle validation errors in ${name}`, async () => {
        const validationError = new Error('Validation failed');
        const mockErrorResponse = { content: [{ type: 'text', text: 'validation error' }] };

        mockedValidateInput.mockImplementation(() => { throw validationError; });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handler({});

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it(`should handle network errors in ${name}`, async () => {
        const networkError = new Error('Network Error');
        networkError.code = 'ECONNREFUSED';
        const mockErrorResponse = { content: [{ type: 'text', text: 'network error' }] };

        mockedValidateInput.mockReturnValue({});
        // Mock the first API call to throw for each handler
        if (name.includes('Projects')) mockedGetVisibleProjects.mockRejectedValue(networkError);
        else if (name.includes('My Issues')) mockedGetMyIssues.mockRejectedValue(networkError);
        else if (name.includes('Update')) mockedUpdateIssue.mockRejectedValue(networkError);
        else if (name.includes('Comment')) mockedAddComment.mockRejectedValue(networkError);
        else if (name.includes('Types')) mockedGetIssueTypes.mockRejectedValue(networkError);
        else if (name.includes('Users')) mockedGetUsers.mockRejectedValue(networkError);
        else if (name.includes('Priorities')) mockedGetPriorities.mockRejectedValue(networkError);
        else if (name.includes('Statuses')) mockedGetStatuses.mockRejectedValue(networkError);
        else if (name.includes('Project Info')) mockedGetProjectDetails.mockRejectedValue(networkError);
        else if (name.includes('Subtask')) mockedCreateSubtask.mockRejectedValue(networkError);

        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handler({});

        expect(mockedHandleError).toHaveBeenCalledWith(networkError);
        expect(result).toEqual(mockErrorResponse);
      });
    });
  });
});