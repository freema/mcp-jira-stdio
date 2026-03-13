import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  handleGetTransitions,
  getTransitionsTool,
  handleTransitionIssue,
  transitionIssueTool,
} from '../../../src/tools/index.js';
import { validateInput } from '../../../src/utils/validators.js';
import { getTransitions, transitionIssue, getIssue } from '../../../src/utils/api-helpers.js';
import { formatTransitionsResponse, formatIssueResponse } from '../../../src/utils/formatters.js';
import { handleError } from '../../../src/utils/error-handler.js';
import {
  mockJiraIssue,
  mockJiraTransition,
  mockJiraTransitionDone,
  mockJiraTransitions,
  mockNotFoundError,
} from '../../mocks/jira-responses.js';
import { TOOL_NAMES } from '../../../src/config/constants.js';

// Mock all dependencies
vi.mock('../../../src/utils/validators.js');
vi.mock('../../../src/utils/api-helpers.js');
vi.mock('../../../src/utils/formatters.js');
vi.mock('../../../src/utils/error-handler.js');

const mockedValidateInput = vi.mocked(validateInput);
const mockedGetTransitions = vi.mocked(getTransitions);
const mockedTransitionIssue = vi.mocked(transitionIssue);
const mockedGetIssue = vi.mocked(getIssue);
const mockedFormatTransitionsResponse = vi.mocked(formatTransitionsResponse);
const mockedFormatIssueResponse = vi.mocked(formatIssueResponse);
const mockedHandleError = vi.mocked(handleError);

describe('Transition Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Get Transitions Tool', () => {
    it('should have correct configuration', () => {
      expect(getTransitionsTool.name).toBe(TOOL_NAMES.GET_TRANSITIONS);
      expect(getTransitionsTool.description).toContain('transitions');
      expect(getTransitionsTool.inputSchema.required).toEqual(['issueKey']);
    });

    it('should handle successful transitions retrieval', async () => {
      const input = { issueKey: 'TEST-123' };
      const mockResponse = { content: [{ type: 'text' as const, text: 'transitions' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedGetTransitions.mockResolvedValue(mockJiraTransitions);
      mockedFormatTransitionsResponse.mockReturnValue(mockResponse);

      const result = await handleGetTransitions(input);

      expect(mockedGetTransitions).toHaveBeenCalledWith('TEST-123');
      expect(mockedFormatTransitionsResponse).toHaveBeenCalledWith(mockJiraTransitions, 'TEST-123');
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors', async () => {
      const mockErrorResponse = { content: [{ type: 'text' as const, text: 'error' }] };

      mockedValidateInput.mockReturnValue({ issueKey: 'TEST-123' });
      mockedGetTransitions.mockRejectedValue(mockNotFoundError);
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleGetTransitions({ issueKey: 'TEST-123' });

      expect(mockedHandleError).toHaveBeenCalledWith(mockNotFoundError);
      expect(result).toEqual(mockErrorResponse);
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed');
      const mockErrorResponse = { content: [{ type: 'text' as const, text: 'validation error' }] };

      mockedValidateInput.mockImplementation(() => {
        throw validationError;
      });
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleGetTransitions({});

      expect(mockedHandleError).toHaveBeenCalledWith(validationError);
      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('Transition Issue Tool', () => {
    it('should have correct configuration', () => {
      expect(transitionIssueTool.name).toBe(TOOL_NAMES.TRANSITION_ISSUE);
      expect(transitionIssueTool.description).toContain('Transitions a Jira issue');
      expect(transitionIssueTool.inputSchema.required).toEqual(['issueKey']);
    });

    it('should handle transition by ID', async () => {
      const input = { issueKey: 'TEST-123', transitionId: '21' };
      const mockResponse = { content: [{ type: 'text' as const, text: 'transitioned' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedTransitionIssue.mockResolvedValue(undefined);
      mockedGetIssue.mockResolvedValue(mockJiraIssue);
      mockedFormatIssueResponse.mockReturnValue(mockResponse);

      const result = await handleTransitionIssue(input);

      expect(mockedTransitionIssue).toHaveBeenCalledWith('TEST-123', '21', {});
      expect(mockedGetIssue).toHaveBeenCalledWith('TEST-123');
      expect(result).toEqual(mockResponse);
    });

    it('should handle transition by name', async () => {
      const input = { issueKey: 'TEST-123', transitionName: 'In Progress' };
      const mockResponse = { content: [{ type: 'text' as const, text: 'transitioned' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedGetTransitions.mockResolvedValue(mockJiraTransitions);
      mockedTransitionIssue.mockResolvedValue(undefined);
      mockedGetIssue.mockResolvedValue(mockJiraIssue);
      mockedFormatIssueResponse.mockReturnValue(mockResponse);

      const result = await handleTransitionIssue(input);

      expect(mockedGetTransitions).toHaveBeenCalledWith('TEST-123');
      expect(mockedTransitionIssue).toHaveBeenCalledWith('TEST-123', '21', {});
      expect(result).toEqual(mockResponse);
    });

    it('should handle transition by name case-insensitively', async () => {
      const input = { issueKey: 'TEST-123', transitionName: 'in progress' };
      const mockResponse = { content: [{ type: 'text' as const, text: 'transitioned' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedGetTransitions.mockResolvedValue(mockJiraTransitions);
      mockedTransitionIssue.mockResolvedValue(undefined);
      mockedGetIssue.mockResolvedValue(mockJiraIssue);
      mockedFormatIssueResponse.mockReturnValue(mockResponse);

      const result = await handleTransitionIssue(input);

      expect(mockedTransitionIssue).toHaveBeenCalledWith('TEST-123', '21', {});
      expect(result).toEqual(mockResponse);
    });

    it('should return error for unknown transition name', async () => {
      const input = { issueKey: 'TEST-123', transitionName: 'Nonexistent' };

      mockedValidateInput.mockReturnValue(input);
      mockedGetTransitions.mockResolvedValue(mockJiraTransitions);

      const result = await handleTransitionIssue(input);

      expect(result.content[0].text).toContain('Transition "Nonexistent" not found');
      expect(result.content[0].text).toContain('In Progress');
      expect(result.content[0].text).toContain('Done');
    });

    it('should handle transition with comment and resolution', async () => {
      const input = {
        issueKey: 'TEST-123',
        transitionId: '31',
        comment: 'Closing this issue',
        resolution: 'Fixed',
        format: 'markdown' as const,
      };
      const mockResponse = { content: [{ type: 'text' as const, text: 'transitioned' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedTransitionIssue.mockResolvedValue(undefined);
      mockedGetIssue.mockResolvedValue(mockJiraIssue);
      mockedFormatIssueResponse.mockReturnValue(mockResponse);

      const result = await handleTransitionIssue(input);

      expect(mockedTransitionIssue).toHaveBeenCalledWith('TEST-123', '31', {
        comment: 'Closing this issue',
        resolution: 'Fixed',
        format: 'markdown',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const mockErrorResponse = { content: [{ type: 'text' as const, text: 'api error' }] };

      mockedValidateInput.mockReturnValue({ issueKey: 'TEST-123', transitionId: '21' });
      mockedTransitionIssue.mockRejectedValue(mockNotFoundError);
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleTransitionIssue({ issueKey: 'TEST-123', transitionId: '21' });

      expect(mockedHandleError).toHaveBeenCalledWith(mockNotFoundError);
      expect(result).toEqual(mockErrorResponse);
    });
  });
});
