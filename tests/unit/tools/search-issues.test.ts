import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleSearchIssues, searchIssuesTool } from '../../../src/tools/search-issues.js';
import { validateInput } from '../../../src/utils/validators.js';
import { searchIssues } from '../../../src/utils/api-helpers.js';
import { formatSearchResultsResponse } from '../../../src/utils/formatters.js';
import { handleError } from '../../../src/utils/error-handler.js';
import { mockJiraSearchResult, mockUnauthorizedError } from '../../mocks/jira-responses.js';
import { TOOL_NAMES } from '../../../src/config/constants.js';

// Mock dependencies
vi.mock('../../../src/utils/validators.js');
vi.mock('../../../src/utils/api-helpers.js');
vi.mock('../../../src/utils/formatters.js');
vi.mock('../../../src/utils/error-handler.js');

const mockedValidateInput = vi.mocked(validateInput);
const mockedSearchIssues = vi.mocked(searchIssues);
const mockedFormatSearchResultsResponse = vi.mocked(formatSearchResultsResponse);
const mockedHandleError = vi.mocked(handleError);

describe('search-issues tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchIssuesTool configuration', () => {
    it('should have correct tool configuration', () => {
      expect(searchIssuesTool.name).toBe(TOOL_NAMES.SEARCH_ISSUES);
      expect(searchIssuesTool.description).toContain('Search for Jira issues using JQL');
      expect(searchIssuesTool.inputSchema.type).toBe('object');
      expect(searchIssuesTool.inputSchema.required).toEqual(['jql']);
      
      // Check required fields
      expect(searchIssuesTool.inputSchema.properties.jql).toBeDefined();
      
      // Check optional fields with defaults
      expect(searchIssuesTool.inputSchema.properties.startAt).toBeDefined();
      expect(searchIssuesTool.inputSchema.properties.maxResults).toBeDefined();
      expect(searchIssuesTool.inputSchema.properties.fields).toBeDefined();
      expect(searchIssuesTool.inputSchema.properties.expand).toBeDefined();
    });
  });

  describe('handleSearchIssues', () => {
    describe('Success Cases', () => {
      it('should search issues with basic JQL', async () => {
        const input = { jql: 'project = TEST' };
        const validatedInput = { jql: 'project = TEST', startAt: 0, maxResults: 50 };
        const mockResponse = { content: [{ type: 'text', text: 'search results' }] };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue(mockResponse);

        const result = await handleSearchIssues(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(expect.any(Object), input);
        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: 'project = TEST',
          startAt: 0,
          maxResults: 50
        });
        expect(mockedFormatSearchResultsResponse).toHaveBeenCalledWith(mockJiraSearchResult);
        expect(result).toEqual(mockResponse);
      });

      it('should search issues with pagination parameters', async () => {
        const input = { 
          jql: 'project = TEST', 
          startAt: 25, 
          maxResults: 10 
        };
        const validatedInput = { ...input };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: 'project = TEST',
          startAt: 25,
          maxResults: 10
        });
      });

      it('should search issues with specific fields', async () => {
        const input = { 
          jql: 'project = TEST',
          fields: ['summary', 'status', 'assignee']
        };
        const validatedInput = { 
          ...input, 
          startAt: 0, 
          maxResults: 50 
        };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: 'project = TEST',
          startAt: 0,
          maxResults: 50,
          fields: ['summary', 'status', 'assignee']
        });
      });

      it('should search issues with expand options', async () => {
        const input = { 
          jql: 'project = TEST',
          expand: ['comments', 'changelog']
        };
        const validatedInput = { 
          ...input, 
          startAt: 0, 
          maxResults: 50 
        };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: 'project = TEST',
          startAt: 0,
          maxResults: 50,
          expand: ['comments', 'changelog']
        });
      });

      it('should search issues with all parameters', async () => {
        const input = { 
          jql: 'project = TEST AND assignee = currentUser()',
          startAt: 10,
          maxResults: 25,
          fields: ['summary', 'status'],
          expand: ['comments']
        };
        const validatedInput = { ...input };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: 'project = TEST AND assignee = currentUser()',
          startAt: 10,
          maxResults: 25,
          fields: ['summary', 'status'],
          expand: ['comments']
        });
      });

      it('should handle complex JQL queries', async () => {
        const complexJql = 'project in (TEST, DEMO) AND status in ("In Progress", "Open") AND priority >= High AND assignee in membersOf("jira-developers") ORDER BY created DESC';
        const input = { jql: complexJql };
        const validatedInput = { 
          jql: complexJql,
          startAt: 0,
          maxResults: 50
        };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: complexJql,
          startAt: 0,
          maxResults: 50
        });
      });

      it('should handle undefined optional fields gracefully', async () => {
        const validatedInput = {
          jql: 'project = TEST',
          startAt: 0,
          maxResults: 50,
          fields: undefined,
          expand: undefined
        };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues({});

        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: 'project = TEST',
          startAt: 0,
          maxResults: 50
        });
      });
    });

    describe('Validation', () => {
      it('should validate input using schema', async () => {
        const input = { jql: 'project = TEST' };
        
        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(
          expect.objectContaining({
            _def: expect.objectContaining({
              typeName: 'ZodObject'
            })
          }),
          input
        );
      });

      it('should handle validation errors for missing JQL', async () => {
        const input = {}; // missing jql
        const validationError = new Error('Validation failed: jql is required');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for invalid startAt', async () => {
        const input = { jql: 'project = TEST', startAt: -1 };
        const validationError = new Error('Validation failed: startAt must be non-negative');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for invalid maxResults', async () => {
        const input = { jql: 'project = TEST', maxResults: 101 };
        const validationError = new Error('Validation failed: maxResults must be between 1 and 100');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for empty JQL string', async () => {
        const input = { jql: '' };
        const validationError = new Error('Validation failed: jql cannot be empty');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for invalid field types', async () => {
        const input = { 
          jql: 'project = TEST', 
          startAt: 'invalid', 
          fields: 'not-an-array' 
        };
        const validationError = new Error('Validation failed: startAt must be number, fields must be array');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });
    });

    describe('Error Handling', () => {
      it('should handle API errors from searchIssues', async () => {
        const input = { jql: 'project = TEST' };
        const apiError = {
          response: {
            status: 400,
            data: { errorMessages: ['Invalid JQL syntax'] }
          }
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'API error' }] };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockRejectedValue(apiError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(apiError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle authentication errors', async () => {
        const input = { jql: 'project = TEST' };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Auth error' }] };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockRejectedValue(mockUnauthorizedError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(mockUnauthorizedError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle permission errors', async () => {
        const input = { jql: 'project = PRIVATE' };
        const permissionError = { 
          response: { 
            status: 403, 
            data: { errorMessages: ['Insufficient permissions to search this project'] } 
          } 
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Permission error' }] };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockRejectedValue(permissionError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(permissionError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle invalid JQL syntax errors', async () => {
        const input = { jql: 'invalid jql syntax here' };
        const jqlError = { 
          response: { 
            status: 400, 
            data: { 
              errorMessages: ['Error in the JQL Query: The character \'h\' is a reserved word and cannot be used in field names'] 
            } 
          } 
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'JQL error' }] };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockRejectedValue(jqlError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(jqlError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle network errors', async () => {
        const input = { jql: 'project = TEST' };
        const networkError = new Error('Network Error');
        networkError.code = 'ECONNREFUSED';
        const mockErrorResponse = { content: [{ type: 'text', text: 'Network error' }] };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockRejectedValue(networkError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(networkError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle timeout errors', async () => {
        const input = { jql: 'project = TEST' };
        const timeoutError = new Error('Request timeout');
        timeoutError.code = 'ECONNABORTED';
        const mockErrorResponse = { content: [{ type: 'text', text: 'Timeout error' }] };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockRejectedValue(timeoutError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(timeoutError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle rate limit errors', async () => {
        const input = { jql: 'project = TEST' };
        const rateLimitError = { 
          response: { 
            status: 429, 
            data: { errorMessages: ['Rate limit exceeded'] } 
          } 
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Rate limit error' }] };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockRejectedValue(rateLimitError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(rateLimitError);
        expect(result).toEqual(mockErrorResponse);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very complex JQL with multiple conditions', async () => {
        const complexJql = `
          project in (TEST, DEMO, PROD) 
          AND status in ("To Do", "In Progress", "Code Review", "Testing", "Done") 
          AND priority in (Blocker, Critical, High) 
          AND assignee in membersOf("jira-developers") 
          AND reporter in membersOf("product-owners") 
          AND created >= -30d 
          AND updated >= -7d 
          AND labels in (urgent, critical, bug, feature) 
          AND component in ("Frontend", "Backend", "Database", "API") 
          AND fixVersion in ("v1.0", "v1.1", "v2.0") 
          ORDER BY priority DESC, created ASC
        `;
        
        const input = { jql: complexJql };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: complexJql,
          startAt: 0,
          maxResults: 50
        });
      });

      it('should handle JQL with special characters and quotes', async () => {
        const specialJql = 'summary ~ "test\'s \\"quoted\\" string" AND description ~ "Line 1\\nLine 2\\tTabbed"';
        const input = { jql: specialJql };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: specialJql,
          startAt: 0,
          maxResults: 50
        });
      });

      it('should handle large field and expand arrays', async () => {
        const input = { 
          jql: 'project = TEST',
          fields: Array(50).fill('field').map((f, i) => `${f}${i}`),
          expand: Array(20).fill('expand').map((e, i) => `${e}${i}`)
        };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: 'project = TEST',
          startAt: 0,
          maxResults: 50,
          fields: input.fields,
          expand: input.expand
        });
      });

      it('should handle boundary values for pagination', async () => {
        const input = { 
          jql: 'project = TEST', 
          startAt: 0, 
          maxResults: 1 
        };

        mockedValidateInput.mockReturnValue(input);
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith(input);
      });

      it('should handle maximum pagination values', async () => {
        const input = { 
          jql: 'project = TEST', 
          startAt: 999999, 
          maxResults: 100 
        };

        mockedValidateInput.mockReturnValue(input);
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith(input);
      });

      it('should handle null input', async () => {
        const validationError = new Error('Input cannot be null');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleSearchIssues(null);

        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle empty search results', async () => {
        const input = { jql: 'project = NONEXISTENT' };
        const emptyResults = { ...mockJiraSearchResult, total: 0, issues: [] };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockResolvedValue(emptyResults);
        mockedFormatSearchResultsResponse.mockReturnValue({ 
          content: [{ type: 'text', text: 'No issues found' }] 
        });

        const result = await handleSearchIssues(input);

        expect(mockedFormatSearchResultsResponse).toHaveBeenCalledWith(emptyResults);
        expect(result.content[0].text).toBe('No issues found');
      });

      it('should handle JQL functions and operators', async () => {
        const functionalJql = `
          assignee = currentUser() 
          AND reporter in membersOf("jira-users") 
          AND duedate >= startOfWeek() 
          AND created >= startOfMonth(-1) 
          AND worklogDate >= now("-1w")
        `;
        
        const input = { jql: functionalJql };

        mockedValidateInput.mockReturnValue({ ...input, startAt: 0, maxResults: 50 });
        mockedSearchIssues.mockResolvedValue(mockJiraSearchResult);
        mockedFormatSearchResultsResponse.mockReturnValue({ content: [] });

        await handleSearchIssues(input);

        expect(mockedSearchIssues).toHaveBeenCalledWith({
          jql: functionalJql,
          startAt: 0,
          maxResults: 50
        });
      });
    });
  });
});