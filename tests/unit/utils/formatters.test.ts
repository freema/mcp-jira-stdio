import { describe, it, expect } from 'vitest';
import {
  formatProjectsResponse,
  formatIssueResponse,
  formatSearchResultsResponse,
  formatErrorResponse,
  formatSuccessResponse,
  formatUsersResponse,
  formatIssueTypesResponse,
  formatPrioritiesResponse,
  formatStatusesResponse,
  formatCommentResponse,
  formatProjectDetailsResponse,
} from '../../../src/utils/formatters.js';
import {
  mockJiraProject,
  mockJiraIssue,
  mockJiraSearchResult,
  mockJiraUser,
  mockJiraIssueType,
  mockJiraPriority,
  mockJiraStatus,
  mockJiraComment,
  mockJiraProjectDetails,
} from '../../mocks/jira-responses.js';

describe('formatters', () => {
  describe('formatProjectsResponse', () => {
    it('should format single project correctly', () => {
      const projects = [mockJiraProject];
      const result = formatProjectsResponse(projects);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Found 1 visible project(s):

• **TEST** - Test Project
  A test project
  Type: software | Private: No`,
          },
        ],
      });
    });

    it('should format multiple projects correctly', () => {
      const projects = [
        mockJiraProject,
        { ...mockJiraProject, key: 'PROJ2', name: 'Project 2', description: null, isPrivate: true },
      ];
      const result = formatProjectsResponse(projects);

      expect(result.content[0].text).toContain('Found 2 visible project(s)');
      expect(result.content[0].text).toContain('• **TEST** - Test Project');
      expect(result.content[0].text).toContain('• **PROJ2** - Project 2');
      expect(result.content[0].text).toContain('Private: Yes');
      expect(result.content[0].text).toContain('No description');
    });

    it('should handle empty projects array', () => {
      const result = formatProjectsResponse([]);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Found 0 visible project(s):\n\n',
          },
        ],
      });
    });
  });

  describe('formatIssueResponse', () => {
    it('should format issue with all fields correctly', () => {
      const result = formatIssueResponse(mockJiraIssue);

      expect(result.content[0].text).toContain('**TEST-123: Test issue summary**');
      expect(result.content[0].text).toContain('**Status:** Open');
      expect(result.content[0].text).toContain('**Priority:** High');
      expect(result.content[0].text).toContain('**Assignee:** Test User (test-account-id-123)');
      expect(result.content[0].text).toContain('**Reporter:** Test User (test-account-id-123)');
      expect(result.content[0].text).toContain('**Project:** Test Project (TEST)');
      expect(result.content[0].text).toContain('**Issue Type:** Bug');
      expect(result.content[0].text).toContain('**Labels:** test-label');
      expect(result.content[0].text).toContain('**Components:** None');
      expect(result.content[0].text).toContain('**Description:**\nTest issue description');
    });

    it('should handle issue without assignee', () => {
      const issueWithoutAssignee = {
        ...mockJiraIssue,
        fields: { ...mockJiraIssue.fields, assignee: null },
      };
      const result = formatIssueResponse(issueWithoutAssignee);

      expect(result.content[0].text).toContain('**Assignee:** Unassigned');
    });

    it('should handle issue without priority', () => {
      const issueWithoutPriority = {
        ...mockJiraIssue,
        fields: { ...mockJiraIssue.fields, priority: null },
      };
      const result = formatIssueResponse(issueWithoutPriority);

      expect(result.content[0].text).toContain('**Priority:** None');
    });

    it('should handle issue without description', () => {
      const issueWithoutDescription = {
        ...mockJiraIssue,
        fields: { ...mockJiraIssue.fields, description: null },
      };
      const result = formatIssueResponse(issueWithoutDescription);

      expect(result.content[0].text).toContain('**Description:**\nNo description provided');
    });

    it('should handle issue with components', () => {
      const issueWithComponents = {
        ...mockJiraIssue,
        fields: {
          ...mockJiraIssue.fields,
          components: [{ name: 'Frontend' }, { name: 'Backend' }],
        },
      };
      const result = formatIssueResponse(issueWithComponents);

      expect(result.content[0].text).toContain('**Components:** Frontend, Backend');
    });

    it('should handle issue without labels', () => {
      const issueWithoutLabels = {
        ...mockJiraIssue,
        fields: { ...mockJiraIssue.fields, labels: [] },
      };
      const result = formatIssueResponse(issueWithoutLabels);

      expect(result.content[0].text).toContain('**Labels:** None');
    });
  });

  describe('formatSearchResultsResponse', () => {
    it('should format search results with issues', () => {
      const result = formatSearchResultsResponse(mockJiraSearchResult);

      expect(result.content[0].text).toContain('Found 1 issue(s)');
      expect(result.content[0].text).toContain('• **TEST-123** - Test issue summary');
      expect(result.content[0].text).toContain(
        'Status: Open | Assignee: Test User | Priority: High'
      );
    });

    it('should handle empty search results', () => {
      const emptyResult = { ...mockJiraSearchResult, total: 0, issues: [] };
      const result = formatSearchResultsResponse(emptyResult);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No issues found matching your search criteria.',
          },
        ],
      });
    });

    it('should show pagination info when there are more results', () => {
      const paginatedResult = {
        ...mockJiraSearchResult,
        total: 100,
        maxResults: 25,
        startAt: 0,
      };
      const result = formatSearchResultsResponse(paginatedResult);

      expect(result.content[0].text).toContain('*Showing 1-25 of 100 results*');
    });

    it('should handle issues without assignee', () => {
      const resultWithUnassigned = {
        ...mockJiraSearchResult,
        issues: [
          {
            ...mockJiraIssue,
            fields: { ...mockJiraIssue.fields, assignee: null },
          },
        ],
      };
      const result = formatSearchResultsResponse(resultWithUnassigned);

      expect(result.content[0].text).toContain('Assignee: Unassigned');
    });
  });

  describe('formatErrorResponse', () => {
    it('should format string error', () => {
      const result = formatErrorResponse('Test error message');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: Test error message',
          },
        ],
      });
    });

    it('should format Error object', () => {
      const error = new Error('Test error');
      const result = formatErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: Test error',
          },
        ],
      });
    });

    it('should format Jira API error with errorMessages', () => {
      const jiraError = {
        response: {
          data: {
            errorMessages: ['Error 1', 'Error 2'],
          },
        },
      };
      const result = formatErrorResponse(jiraError);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: Error 1, Error 2',
          },
        ],
      });
    });

    it('should format Jira API error with field errors', () => {
      const jiraError = {
        response: {
          data: {
            errors: {
              summary: 'Summary is required',
              project: 'Project is required',
            },
          },
        },
      };
      const result = formatErrorResponse(jiraError);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: summary: Summary is required, project: Project is required',
          },
        ],
      });
    });

    it('should handle unknown error types', () => {
      const result = formatErrorResponse({ unknownProperty: 'value' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: An unexpected error occurred.',
          },
        ],
      });
    });
  });

  describe('formatSuccessResponse', () => {
    it('should format success message', () => {
      const result = formatSuccessResponse('Operation completed successfully');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Operation completed successfully',
          },
        ],
      });
    });
  });

  describe('formatUsersResponse', () => {
    it('should format users list', () => {
      const users = [mockJiraUser];
      const result = formatUsersResponse(users);

      expect(result.content[0].text).toContain('Found 1 user(s)');
      expect(result.content[0].text).toContain('• **Test User** (test-account-id-123)');
      expect(result.content[0].text).toContain('Email: test@example.com');
      expect(result.content[0].text).toContain('Active: Yes');
    });

    it('should handle empty users list', () => {
      const result = formatUsersResponse([]);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No users found matching your search criteria.',
          },
        ],
      });
    });

    it('should handle user without email', () => {
      const userWithoutEmail = { ...mockJiraUser, emailAddress: null };
      const result = formatUsersResponse([userWithoutEmail]);

      expect(result.content[0].text).toContain('Email: N/A');
    });
  });

  describe('formatIssueTypesResponse', () => {
    it('should format issue types list', () => {
      const issueTypes = [mockJiraIssueType];
      const result = formatIssueTypesResponse(issueTypes);

      expect(result.content[0].text).toContain('Found 1 issue type(s)');
      expect(result.content[0].text).toContain('• **Bug** (ID: test-issue-type-id)');
      expect(result.content[0].text).toContain('A problem which impairs or prevents the functions');
      expect(result.content[0].text).toContain('Subtask: No');
    });

    it('should handle empty issue types list', () => {
      const result = formatIssueTypesResponse([]);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No issue types found.',
          },
        ],
      });
    });

    it('should handle subtask issue types', () => {
      const subtaskType = { ...mockJiraIssueType, subtask: true };
      const result = formatIssueTypesResponse([subtaskType]);

      expect(result.content[0].text).toContain('Subtask: Yes');
    });
  });

  describe('formatPrioritiesResponse', () => {
    it('should format priorities list', () => {
      const priorities = [mockJiraPriority];
      const result = formatPrioritiesResponse(priorities);

      expect(result.content[0].text).toContain('Found 1 priority level(s)');
      expect(result.content[0].text).toContain('• **High** (ID: test-priority-id)');
      expect(result.content[0].text).toContain('This problem will block progress.');
    });

    it('should handle empty priorities list', () => {
      const result = formatPrioritiesResponse([]);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No priorities found.',
          },
        ],
      });
    });
  });

  describe('formatStatusesResponse', () => {
    it('should format statuses list', () => {
      const statuses = [mockJiraStatus];
      const result = formatStatusesResponse(statuses);

      expect(result.content[0].text).toContain('Found 1 status(es)');
      expect(result.content[0].text).toContain('• **Open** (ID: test-status-id)');
      expect(result.content[0].text).toContain('The issue is open and ready for the assignee');
      expect(result.content[0].text).toContain('Category: New (new)');
    });

    it('should handle empty statuses list', () => {
      const result = formatStatusesResponse([]);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No statuses found.',
          },
        ],
      });
    });
  });

  describe('formatCommentResponse', () => {
    it('should format comment without visibility', () => {
      const result = formatCommentResponse(mockJiraComment);

      expect(result.content[0].text).toContain('**Comment added successfully**');
      expect(result.content[0].text).toContain('**Author:** Test User');
      expect(result.content[0].text).toContain('**Content:**\nThis is a test comment');
      expect(result.content[0].text).not.toContain('**Visibility:**');
    });

    it('should format comment with visibility', () => {
      const commentWithVisibility = {
        ...mockJiraComment,
        visibility: { type: 'group', value: 'jira-developers' },
      };
      const result = formatCommentResponse(commentWithVisibility);

      expect(result.content[0].text).toContain('**Visibility:** group - jira-developers');
    });
  });

  describe('formatProjectDetailsResponse', () => {
    it('should format project details correctly', () => {
      const result = formatProjectDetailsResponse(mockJiraProjectDetails);

      expect(result.content[0].text).toContain('**TEST: Test Project**');
      expect(result.content[0].text).toContain('**Description:** A test project');
      expect(result.content[0].text).toContain('**Type:** software');
      expect(result.content[0].text).toContain('**Private:** No');
      expect(result.content[0].text).toContain('**Lead:** Test User (test-account-id-123)');
      expect(result.content[0].text).toContain('**Components:** None');
      expect(result.content[0].text).toContain('**Versions:** None');
      expect(result.content[0].text).toContain('**Issue Types:** Bug');
      expect(result.content[0].text).toContain('**Roles:** Administrators, Developers');
    });

    it('should handle project without lead', () => {
      const projectWithoutLead = { ...mockJiraProjectDetails, lead: null };
      const result = formatProjectDetailsResponse(projectWithoutLead);

      expect(result.content[0].text).toContain('**Lead:** No lead assigned');
    });

    it('should handle project with insights', () => {
      const projectWithInsights = {
        ...mockJiraProjectDetails,
        insight: {
          totalIssueCount: 42,
          lastIssueUpdateTime: '2023-01-01T12:00:00.000Z',
        },
      };
      const result = formatProjectDetailsResponse(projectWithInsights);

      expect(result.content[0].text).toContain('**Project Insights:**');
      expect(result.content[0].text).toContain('Total Issues: 42');
      expect(result.content[0].text).toContain('Last Updated:');
    });

    it('should handle subtask issue types', () => {
      const projectWithSubtasks = {
        ...mockJiraProjectDetails,
        issueTypes: [mockJiraIssueType, { ...mockJiraIssueType, name: 'Sub-task', subtask: true }],
      };
      const result = formatProjectDetailsResponse(projectWithSubtasks);

      expect(result.content[0].text).toContain('**Issue Types:** Bug, Sub-task (Subtask)');
    });
  });
});
