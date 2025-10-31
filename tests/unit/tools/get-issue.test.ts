import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleGetIssue, getIssueTool } from '../../../src/tools/get-issue.js';
import { validateInput, extractIssueKey } from '../../../src/utils/validators.js';
import { getIssue } from '../../../src/utils/api-helpers.js';
import { formatIssueResponse } from '../../../src/utils/formatters.js';
import { handleError } from '../../../src/utils/error-handler.js';
import { mockJiraIssue, mockNotFoundError } from '../../mocks/jira-responses.js';
import { TOOL_NAMES } from '../../../src/config/constants.js';

// Mock dependencies
vi.mock('../../../src/utils/validators.js');
vi.mock('../../../src/utils/api-helpers.js');
vi.mock('../../../src/utils/formatters.js');
vi.mock('../../../src/utils/error-handler.js');

const mockedValidateInput = vi.mocked(validateInput);
const mockedExtractIssueKey = vi.mocked(extractIssueKey);
const mockedGetIssue = vi.mocked(getIssue);
const mockedFormatIssueResponse = vi.mocked(formatIssueResponse);
const mockedHandleError = vi.mocked(handleError);

describe('get-issue tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default behavior: extractIssueKey returns the input as-is (for plain issue keys)
    mockedExtractIssueKey.mockImplementation((input) => {
      // Simulate real behavior: extract from URL or return null
      const match = input.match(/[A-Z][A-Z0-9]*-\d+/);
      return match ? match[0] : null;
    });
  });

  describe('getIssueTool configuration', () => {
    it('should have correct tool configuration', () => {
      expect(getIssueTool.name).toBe(TOOL_NAMES.GET_ISSUE);
      expect(typeof getIssueTool.description).toBe('string');
      expect(getIssueTool.description.toLowerCase()).toContain('issue');
      expect(getIssueTool.inputSchema.type).toBe('object');
      expect(getIssueTool.inputSchema.required).toEqual(['issueKey']);
      expect(getIssueTool.inputSchema.properties.issueKey).toBeDefined();
      expect(getIssueTool.inputSchema.properties.expand).toBeDefined();
      expect(getIssueTool.inputSchema.properties.fields).toBeDefined();
    });
  });

  describe('handleGetIssue', () => {
    describe('Success Cases', () => {
      it('should handle basic issue retrieval', async () => {
        const input = { issueKey: 'TEST-123' };
        const validatedInput = { issueKey: 'TEST-123' };
        const mockResponse = { content: [{ type: 'text', text: 'formatted issue' }] };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedGetIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue(mockResponse);

        const result = await handleGetIssue(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(expect.any(Object), input);
        expect(mockedGetIssue).toHaveBeenCalledWith('TEST-123', {});
        expect(mockedFormatIssueResponse).toHaveBeenCalledWith(mockJiraIssue);
        expect(result).toEqual(mockResponse);
      });

      it('should extract issue key from Jira URL', async () => {
        const input = { issueKey: 'https://example.atlassian.net/browse/PROJ-456' };
        const validatedInput = { issueKey: 'https://example.atlassian.net/browse/PROJ-456' };
        const mockResponse = { content: [{ type: 'text', text: 'formatted issue' }] };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedGetIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue(mockResponse);

        const result = await handleGetIssue(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(expect.any(Object), input);
        expect(mockedExtractIssueKey).toHaveBeenCalledWith(
          'https://example.atlassian.net/browse/PROJ-456'
        );
        expect(mockedGetIssue).toHaveBeenCalledWith('PROJ-456', {});
        expect(mockedFormatIssueResponse).toHaveBeenCalledWith(mockJiraIssue);
        expect(result).toEqual(mockResponse);
      });

      it('should extract issue key from Jira URL with query parameters', async () => {
        const input = {
          issueKey:
            'https://example.atlassian.net/jira/software/projects/ABC/boards/1?selectedIssue=ABC-789',
        };
        const validatedInput = {
          issueKey:
            'https://example.atlassian.net/jira/software/projects/ABC/boards/1?selectedIssue=ABC-789',
        };
        const mockResponse = { content: [{ type: 'text', text: 'formatted issue' }] };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedGetIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue(mockResponse);

        const result = await handleGetIssue(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(expect.any(Object), input);
        expect(mockedExtractIssueKey).toHaveBeenCalledWith(
          'https://example.atlassian.net/jira/software/projects/ABC/boards/1?selectedIssue=ABC-789'
        );
        expect(mockedGetIssue).toHaveBeenCalledWith('ABC-789', {});
        expect(mockedFormatIssueResponse).toHaveBeenCalledWith(mockJiraIssue);
        expect(result).toEqual(mockResponse);
      });

      it('should handle issue retrieval with expand options', async () => {
        const input = {
          issueKey: 'TEST-123',
          expand: ['comments', 'attachments'],
        };
        const validatedInput = {
          issueKey: 'TEST-123',
          expand: ['comments', 'attachments'],
        };
        const mockResponse = { content: [{ type: 'text', text: 'formatted issue' }] };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedGetIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue(mockResponse);

        await handleGetIssue(input);

        expect(mockedGetIssue).toHaveBeenCalledWith('TEST-123', {
          expand: ['comments', 'attachments'],
        });
      });

      it('should handle issue retrieval with specific fields', async () => {
        const input = {
          issueKey: 'TEST-123',
          fields: ['summary', 'status'],
        };
        const validatedInput = {
          issueKey: 'TEST-123',
          fields: ['summary', 'status'],
        };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedGetIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleGetIssue(input);

        expect(mockedGetIssue).toHaveBeenCalledWith('TEST-123', {
          fields: ['summary', 'status'],
        });
      });

      it('should handle issue retrieval with both expand and fields', async () => {
        const input = {
          issueKey: 'TEST-123',
          expand: ['comments'],
          fields: ['summary', 'status'],
        };
        const validatedInput = {
          issueKey: 'TEST-123',
          expand: ['comments'],
          fields: ['summary', 'status'],
        };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedGetIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleGetIssue(input);

        expect(mockedGetIssue).toHaveBeenCalledWith('TEST-123', {
          expand: ['comments'],
          fields: ['summary', 'status'],
        });
      });

      it('should handle undefined expand and fields gracefully', async () => {
        const validatedInput = {
          issueKey: 'TEST-123',
          expand: undefined,
          fields: undefined,
        };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedGetIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleGetIssue({});

        expect(mockedGetIssue).toHaveBeenCalledWith('TEST-123', {});
      });
    });

    describe('Validation', () => {
      it('should validate input using schema', async () => {
        const input = { issueKey: 'TEST-123' };
        mockedValidateInput.mockReturnValue(input);
        mockedGetIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleGetIssue(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(
          expect.objectContaining({
            _def: expect.objectContaining({
              typeName: 'ZodObject',
            }),
          }),
          input
        );
      });

      it('should handle validation errors', async () => {
        const input = { issueKey: '' };
        const validationError = new Error('Validation failed: issueKey is required');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleGetIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });
    });

    describe('Error Handling', () => {
      it('should handle API errors from getIssue', async () => {
        const input = { issueKey: 'TEST-123' };
        const mockErrorResponse = { content: [{ type: 'text', text: 'API error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedGetIssue.mockRejectedValue(mockNotFoundError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleGetIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(mockNotFoundError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle network errors', async () => {
        const input = { issueKey: 'TEST-123' };
        const networkError = new Error('Network Error');
        networkError.code = 'ECONNREFUSED';
        const mockErrorResponse = { content: [{ type: 'text', text: 'Network error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedGetIssue.mockRejectedValue(networkError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleGetIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(networkError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle authentication errors', async () => {
        const input = { issueKey: 'TEST-123' };
        const authError = { response: { status: 401, data: { errorMessages: ['Unauthorized'] } } };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Auth error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedGetIssue.mockRejectedValue(authError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleGetIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(authError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle unexpected errors', async () => {
        const input = { issueKey: 'TEST-123' };
        const unexpectedError = new Error('Something went wrong');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Unexpected error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedGetIssue.mockRejectedValue(unexpectedError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleGetIssue(input);

        expect(mockedHandleError).toHaveBeenCalledWith(unexpectedError);
        expect(result).toEqual(mockErrorResponse);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty input object', async () => {
        const input = {};
        const validationError = new Error('issueKey is required');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleGetIssue(input);

        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle null input', async () => {
        const validationError = new Error('Input cannot be null');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleGetIssue(null);

        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle issue key with whitespace', async () => {
        const input = { issueKey: '  TEST-456  ' };
        const validatedInput = { issueKey: '  TEST-456  ' };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedGetIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleGetIssue(input);

        expect(mockedGetIssue).toHaveBeenCalledWith('TEST-456', {});
      });

      it('should handle very long expand and fields arrays', async () => {
        const input = {
          issueKey: 'TEST-123',
          expand: Array(50).fill('comments'),
          fields: Array(100).fill('summary'),
        };

        mockedValidateInput.mockReturnValue(input);
        mockedGetIssue.mockResolvedValue(mockJiraIssue);
        mockedFormatIssueResponse.mockReturnValue({ content: [] });

        await handleGetIssue(input);

        expect(mockedGetIssue).toHaveBeenCalledWith('TEST-123', {
          expand: Array(50).fill('comments'),
          fields: Array(100).fill('summary'),
        });
      });
    });
  });
});
