import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleCreateIssue, createIssueTool } from '../../../src/tools/create-issue.js';
import { validateInput } from '../../../src/utils/validators.js';
import { createIssue } from '../../../src/utils/api-helpers.js';
import { formatIssueResponse } from '../../../src/utils/formatters.js';
import { handleError } from '../../../src/utils/error-handler.js';
import { mockJiraIssue, mockJiraValidationErrorResponse } from '../../mocks/jira-responses.js';
import { TOOL_NAMES } from '../../../src/config/constants.js';

// Mock dependencies
vi.mock('../../../src/utils/validators.js');
vi.mock('../../../src/utils/api-helpers.js');
vi.mock('../../../src/utils/formatters.js');
vi.mock('../../../src/utils/error-handler.js');

const mockedValidateInput = vi.mocked(validateInput);
const mockedCreateIssue = vi.mocked(createIssue);
const mockedFormatIssueResponse = vi.mocked(formatIssueResponse);
const mockedHandleError = vi.mocked(handleError);

describe('create-issue tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createIssueTool configuration', () => {
    it('should have correct tool configuration', () => {
      expect(createIssueTool.name).toBe(TOOL_NAMES.CREATE_ISSUE);
      expect(createIssueTool.description).toContain('Creates a new Jira issue');
      expect(createIssueTool.inputSchema.type).toBe('object');
      expect(createIssueTool.inputSchema.required).toEqual(['projectKey', 'summary', 'issueType']);
      
      // Check required fields
      expect(createIssueTool.inputSchema.properties.projectKey).toBeDefined();
      expect(createIssueTool.inputSchema.properties.summary).toBeDefined();
      expect(createIssueTool.inputSchema.properties.issueType).toBeDefined();
      
      // Check optional fields
      expect(createIssueTool.inputSchema.properties.description).toBeDefined();
      expect(createIssueTool.inputSchema.properties.priority).toBeDefined();
      expect(createIssueTool.inputSchema.properties.assignee).toBeDefined();
      expect(createIssueTool.inputSchema.properties.labels).toBeDefined();
      expect(createIssueTool.inputSchema.properties.components).toBeDefined();
    });
  });

  describe('handleCreateIssue', () => {
    describe('Success Cases', () => {
      it('should create issue with required fields only', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug'
        };
        const validatedInput = { ...input };
        const mockResponse = { content: [{ type: 'text', text: 'formatted issue' }] };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedCreateIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue(mockResponse);

        const result = await handleCreateIssue(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(expect.any(Object), input);
        expect(mockedCreateIssue).toHaveBeenCalledWith({
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug'
        });
        expect(mockedFormatIssueResponse).toHaveBeenCalledWith(mockJiraIssue);
        expect(result).toEqual(mockResponse);
      });

      it('should create issue with all optional fields', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'New bug report',
          description: 'Detailed description',
          issueType: 'Bug',
          priority: 'High',
          assignee: 'user-123',
          labels: ['urgent', 'bug'],
          components: ['Frontend', 'Backend']
        };
        const validatedInput = { ...input };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedCreateIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleCreateIssue(input);

        expect(mockedCreateIssue).toHaveBeenCalledWith({
          projectKey: 'TEST',
          summary: 'New bug report',
          description: 'Detailed description',
          issueType: 'Bug',
          priority: 'High',
          assignee: 'user-123',
          labels: ['urgent', 'bug'],
          components: ['Frontend', 'Backend']
        });
      });

      it('should handle partial optional fields', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug',
          priority: 'High',
          labels: ['bug']
        };
        const validatedInput = { ...input };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedCreateIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleCreateIssue(input);

        expect(mockedCreateIssue).toHaveBeenCalledWith({
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug',
          priority: 'High',
          labels: ['bug']
        });
      });

      it('should handle empty arrays for labels and components', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug',
          labels: [],
          components: []
        };
        const validatedInput = { ...input };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedCreateIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleCreateIssue(input);

        expect(mockedCreateIssue).toHaveBeenCalledWith({
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug',
          labels: [],
          components: []
        });
      });

      it('should handle undefined optional fields gracefully', async () => {
        const validatedInput = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug',
          description: undefined,
          priority: undefined,
          assignee: undefined,
          labels: undefined,
          components: undefined
        };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedCreateIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleCreateIssue({});

        const expectedParams = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug'
        };

        expect(mockedCreateIssue).toHaveBeenCalledWith(expectedParams);
      });
    });

    describe('Validation', () => {
      it('should validate input using schema', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug'
        };
        
        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleCreateIssue(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(
          expect.objectContaining({
            _def: expect.objectContaining({
              typeName: 'ZodObject'
            })
          }),
          input
        );
      });

      it('should handle validation errors for missing required fields', async () => {
        const input = { projectKey: 'TEST' }; // missing summary and issueType
        const validationError = new Error('Validation failed: summary is required, issueType is required');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for invalid field types', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 123, // should be string
          issueType: 'Bug'
        };
        const validationError = new Error('Validation failed: summary must be string');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for empty summary', async () => {
        const input = {
          projectKey: 'TEST',
          summary: '', // empty string
          issueType: 'Bug'
        };
        const validationError = new Error('Validation failed: summary must be at least 1 character');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });
    });

    describe('Error Handling', () => {
      it('should handle API errors from createIssue', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug'
        };
        const apiError = {
          response: {
            status: 400,
            data: mockJiraValidationErrorResponse
          }
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'API error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssue.mockRejectedValue(apiError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(apiError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle authentication errors', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug'
        };
        const authError = { response: { status: 401, data: { errorMessages: ['Unauthorized'] } } };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Auth error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssue.mockRejectedValue(authError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(authError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle permission errors', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug'
        };
        const permissionError = { 
          response: { 
            status: 403, 
            data: { errorMessages: ['Insufficient permissions to create issues'] } 
          } 
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Permission error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssue.mockRejectedValue(permissionError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(permissionError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle project not found errors', async () => {
        const input = {
          projectKey: 'NONEXISTENT',
          summary: 'New bug report',
          issueType: 'Bug'
        };
        const notFoundError = { 
          response: { 
            status: 404, 
            data: { errorMessages: ['Project not found'] } 
          } 
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Not found error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssue.mockRejectedValue(notFoundError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(notFoundError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle network errors', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug'
        };
        const networkError = new Error('Network Error');
        networkError.code = 'ECONNREFUSED';
        const mockErrorResponse = { content: [{ type: 'text', text: 'Network error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssue.mockRejectedValue(networkError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(networkError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle rate limit errors', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'New bug report',
          issueType: 'Bug'
        };
        const rateLimitError = { 
          response: { 
            status: 429, 
            data: { errorMessages: ['Rate limit exceeded'] } 
          } 
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Rate limit error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssue.mockRejectedValue(rateLimitError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(rateLimitError);
        expect(result).toEqual(mockErrorResponse);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long summary', async () => {
        const longSummary = 'A'.repeat(1000);
        const input = {
          projectKey: 'TEST',
          summary: longSummary,
          issueType: 'Bug'
        };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleCreateIssue(input);

        expect(mockedCreateIssue).toHaveBeenCalledWith({
          projectKey: 'TEST',
          summary: longSummary,
          issueType: 'Bug'
        });
      });

      it('should handle special characters in fields', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'Bug with special chars: äöü@#$%&',
          description: 'Description with\nnewlines\tand\ttabs',
          issueType: 'Bug'
        };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleCreateIssue(input);

        expect(mockedCreateIssue).toHaveBeenCalledWith({
          projectKey: 'TEST',
          summary: 'Bug with special chars: äöü@#$%&',
          description: 'Description with\nnewlines\tand\ttabs',
          issueType: 'Bug'
        });
      });

      it('should handle large arrays of labels and components', async () => {
        const input = {
          projectKey: 'TEST',
          summary: 'Bug with many labels',
          issueType: 'Bug',
          labels: Array(50).fill('label').map((l, i) => `${l}-${i}`),
          components: Array(20).fill('component').map((c, i) => `${c}-${i}`)
        };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleCreateIssue(input);

        expect(mockedCreateIssue).toHaveBeenCalledWith(input);
      });

      it('should handle null input', async () => {
        const validationError = new Error('Input cannot be null');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(null);

        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle empty input object', async () => {
        const input = {};
        const validationError = new Error('Required fields missing');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssue(input);

        expect(result).toEqual(mockErrorResponse);
      });
    });
  });
});