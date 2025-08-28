import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JiraApiError, handleError, createJiraApiError } from '../../../src/utils/error-handler.js';
import { ERROR_MESSAGES } from '../../../src/config/constants.js';
import {
  mockUnauthorizedError,
  mockNotFoundError,
  mockRateLimitError,
  mockNetworkError,
  mockJiraErrorResponse,
  mockJiraValidationErrorResponse,
} from '../../mocks/jira-responses.js';

describe('error-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JiraApiError', () => {
    it('should create error with message only', () => {
      const error = new JiraApiError('Test error');
      expect(error.name).toBe('JiraApiError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBeUndefined();
      expect(error.jiraErrors).toBeUndefined();
      expect(error.originalError).toBeUndefined();
    });

    it('should create error with all properties', () => {
      const originalError = new Error('Original');
      const error = new JiraApiError('Test error', 404, ['Not found'], originalError);

      expect(error.name).toBe('JiraApiError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.jiraErrors).toEqual(['Not found']);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('handleError', () => {
    it('should handle JiraApiError correctly', () => {
      const jiraError = new JiraApiError('Jira API error', 404);
      const result = handleError(jiraError);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: Jira API error',
          },
        ],
      });
    });

    it('should handle 401 unauthorized errors', () => {
      const result = handleError(mockUnauthorizedError);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `❌ Error: ${ERROR_MESSAGES.INVALID_CREDENTIALS}`,
          },
        ],
      });
    });

    it('should handle 404 not found errors', () => {
      const result = handleError(mockNotFoundError);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: Resource not found or insufficient permissions',
          },
        ],
      });
    });

    it('should handle 429 rate limit errors', () => {
      const result = handleError(mockRateLimitError);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `❌ Error: ${ERROR_MESSAGES.RATE_LIMIT_EXCEEDED}`,
          },
        ],
      });
    });

    it('should handle network errors', () => {
      const result = handleError(mockNetworkError);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `❌ Error: ${ERROR_MESSAGES.NETWORK_ERROR}`,
          },
        ],
      });
    });

    it('should handle validation errors', () => {
      const validationError = new Error('validation failed: field is required');
      const result = handleError(validationError);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: validation failed: field is required',
          },
        ],
      });
    });

    it('should handle Jira API errors with errorMessages', () => {
      const error = {
        response: {
          data: mockJiraErrorResponse,
        },
      };
      const result = handleError(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: Issue not found or permission denied',
          },
        ],
      });
    });

    it('should handle Jira API errors with field errors', () => {
      const error = {
        response: {
          data: mockJiraValidationErrorResponse,
        },
      };
      const result = handleError(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: summary: Summary is required, project: Project is required',
          },
        ],
      });
    });

    it('should handle generic Error objects', () => {
      const error = new Error('Generic error message');
      const result = handleError(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: Generic error message',
          },
        ],
      });
    });

    it('should handle string errors', () => {
      const result = handleError('String error message');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: String error message',
          },
        ],
      });
    });

    it('should handle null/undefined errors', () => {
      const result1 = handleError(null);
      const result2 = handleError(undefined);

      expect(result1).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: An unexpected error occurred',
          },
        ],
      });

      expect(result2).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: An unexpected error occurred',
          },
        ],
      });
    });

    it('should handle objects without message', () => {
      const result = handleError({ someProperty: 'value' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Error: An unexpected error occurred',
          },
        ],
      });
    });
  });

  describe('createJiraApiError', () => {
    it('should create error from response with errorMessages', () => {
      const error = {
        response: {
          status: 404,
          data: mockJiraErrorResponse,
        },
      };

      const result = createJiraApiError(error);

      expect(result).toBeInstanceOf(JiraApiError);
      expect(result.message).toBe('Issue not found or permission denied');
      expect(result.statusCode).toBe(404);
      expect(result.jiraErrors).toEqual(['Issue not found or permission denied']);
      expect(result.originalError).toBe(error);
    });

    it('should create error from response with field errors', () => {
      const error = {
        response: {
          status: 400,
          data: mockJiraValidationErrorResponse,
        },
      };

      const result = createJiraApiError(error);

      expect(result).toBeInstanceOf(JiraApiError);
      expect(result.message).toBe('summary: Summary is required, project: Project is required');
      expect(result.statusCode).toBe(400);
      expect(result.jiraErrors).toEqual(['Summary is required', 'Project is required']);
      expect(result.originalError).toBe(error);
    });

    it('should create error from response without specific error data', () => {
      const error = {
        response: {
          status: 500,
          data: { someOtherData: 'value' },
        },
      };

      const result = createJiraApiError(error);

      expect(result).toBeInstanceOf(JiraApiError);
      expect(result.message).toBe('Jira API error (500)');
      expect(result.statusCode).toBe(500);
      expect(result.jiraErrors).toEqual([]);
      expect(result.originalError).toBe(error);
    });

    it('should create error from network error', () => {
      const result = createJiraApiError(mockNetworkError);

      expect(result).toBeInstanceOf(JiraApiError);
      expect(result.message).toBe(ERROR_MESSAGES.NETWORK_ERROR);
      expect(result.statusCode).toBeUndefined();
      expect(result.jiraErrors).toEqual([]);
      expect(result.originalError).toBe(mockNetworkError);
    });

    it('should create error from generic error', () => {
      const genericError = new Error('Generic error');
      const result = createJiraApiError(genericError);

      expect(result).toBeInstanceOf(JiraApiError);
      expect(result.message).toBe('Generic error');
      expect(result.statusCode).toBeUndefined();
      expect(result.jiraErrors).toEqual([]);
      expect(result.originalError).toBe(genericError);
    });

    it('should create error from error without message', () => {
      const errorWithoutMessage = { someProperty: 'value' };
      const result = createJiraApiError(errorWithoutMessage);

      expect(result).toBeInstanceOf(JiraApiError);
      expect(result.message).toBe('Unknown Jira API error');
      expect(result.statusCode).toBeUndefined();
      expect(result.jiraErrors).toEqual([]);
      expect(result.originalError).toBe(errorWithoutMessage);
    });
  });
});
