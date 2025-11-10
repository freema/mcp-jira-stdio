import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  handleCreateIssueLink,
  createIssueLinkTool,
} from '../../../src/tools/create-issue-link.js';
import { validateInput } from '../../../src/utils/validators.js';
import { createIssueLink } from '../../../src/utils/api-helpers.js';
import { formatSuccessResponse } from '../../../src/utils/formatters.js';
import { handleError } from '../../../src/utils/error-handler.js';
import { mockUnauthorizedError } from '../../mocks/jira-responses.js';
import { TOOL_NAMES } from '../../../src/config/constants.js';

// Mock dependencies
vi.mock('../../../src/utils/validators.js');
vi.mock('../../../src/utils/api-helpers.js');
vi.mock('../../../src/utils/formatters.js');
vi.mock('../../../src/utils/error-handler.js');

const mockedValidateInput = vi.mocked(validateInput);
const mockedCreateIssueLink = vi.mocked(createIssueLink);
const mockedFormatSuccessResponse = vi.mocked(formatSuccessResponse);
const mockedHandleError = vi.mocked(handleError);

describe('create-issue-link tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createIssueLinkTool configuration', () => {
    it('should have correct tool configuration', () => {
      expect(createIssueLinkTool.name).toBe(TOOL_NAMES.CREATE_ISSUE_LINK);
      expect(createIssueLinkTool.description).toContain('Creates a link between two Jira issues');
      expect(createIssueLinkTool.inputSchema.type).toBe('object');
      expect(createIssueLinkTool.inputSchema.required).toEqual([
        'fromIssue',
        'toIssue',
        'linkType',
      ]);

      // Check required fields
      expect(createIssueLinkTool.inputSchema.properties.fromIssue).toBeDefined();
      expect(createIssueLinkTool.inputSchema.properties.toIssue).toBeDefined();
      expect(createIssueLinkTool.inputSchema.properties.linkType).toBeDefined();
    });
  });

  describe('handleCreateIssueLink', () => {
    describe('Success Cases', () => {
      it('should create a "blocks" link between issues', async () => {
        const input = {
          fromIssue: 'TEST-123',
          toIssue: 'TEST-456',
          linkType: 'blocks',
        };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(expect.any(Object), input);
        expect(mockedCreateIssueLink).toHaveBeenCalledWith('TEST-123', 'TEST-456', 'blocks');
        expect(mockedFormatSuccessResponse).toHaveBeenCalledWith(
          'Link created: TEST-123 blocks TEST-456'
        );
        expect(result).toEqual(mockResponse);
      });

      it('should create an "is blocked by" link between issues', async () => {
        const input = {
          fromIssue: 'PROJ-100',
          toIssue: 'PROJ-200',
          linkType: 'is blocked by',
        };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith('PROJ-100', 'PROJ-200', 'is blocked by');
        expect(mockedFormatSuccessResponse).toHaveBeenCalledWith(
          'Link created: PROJ-100 is blocked by PROJ-200'
        );
        expect(result).toEqual(mockResponse);
      });

      it('should create a "relates" link between issues', async () => {
        const input = {
          fromIssue: 'MDE-799',
          toIssue: 'MDE-883',
          linkType: 'relates',
        };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith('MDE-799', 'MDE-883', 'relates');
        expect(result).toEqual(mockResponse);
      });

      it('should create a "duplicates" link between issues', async () => {
        const input = {
          fromIssue: 'BUG-111',
          toIssue: 'BUG-222',
          linkType: 'duplicates',
        };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith('BUG-111', 'BUG-222', 'duplicates');
      });

      it('should create a "clones" link between issues', async () => {
        const input = {
          fromIssue: 'STORY-10',
          toIssue: 'STORY-20',
          linkType: 'clones',
        };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith('STORY-10', 'STORY-20', 'clones');
      });

      it('should handle custom link type names', async () => {
        const input = {
          fromIssue: 'CUSTOM-1',
          toIssue: 'CUSTOM-2',
          linkType: 'CustomLinkType',
        };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith(
          'CUSTOM-1',
          'CUSTOM-2',
          'CustomLinkType'
        );
      });

      it('should handle link types with different casing', async () => {
        const input = {
          fromIssue: 'TEST-1',
          toIssue: 'TEST-2',
          linkType: 'BLOCKS',
        };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith('TEST-1', 'TEST-2', 'BLOCKS');
      });
    });

    describe('Validation', () => {
      it('should validate input using schema', async () => {
        const input = {
          fromIssue: 'TEST-123',
          toIssue: 'TEST-456',
          linkType: 'blocks',
        };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue({ content: [] });

        await handleCreateIssueLink(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(
          expect.objectContaining({
            _def: expect.objectContaining({
              typeName: 'ZodObject',
            }),
          }),
          input
        );
      });

      it('should handle validation errors for missing fromIssue', async () => {
        const input = { toIssue: 'TEST-456', linkType: 'blocks' };
        const validationError = new Error('Validation failed: fromIssue is required');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for missing toIssue', async () => {
        const input = { fromIssue: 'TEST-123', linkType: 'blocks' };
        const validationError = new Error('Validation failed: toIssue is required');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for missing linkType', async () => {
        const input = { fromIssue: 'TEST-123', toIssue: 'TEST-456' };
        const validationError = new Error('Validation failed: linkType is required');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for invalid issue key format', async () => {
        const input = { fromIssue: 'INVALID', toIssue: 'TEST-456', linkType: 'blocks' };
        const validationError = new Error('Validation failed: Invalid issue key format');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });
    });

    describe('Error Handling', () => {
      it('should handle API errors from createIssueLink', async () => {
        const input = { fromIssue: 'TEST-123', toIssue: 'TEST-456', linkType: 'blocks' };
        const apiError = {
          response: {
            status: 400,
            data: { errorMessages: ['Invalid link type'] },
          },
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'API error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockRejectedValue(apiError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedHandleError).toHaveBeenCalledWith(apiError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle authentication errors', async () => {
        const input = { fromIssue: 'TEST-123', toIssue: 'TEST-456', linkType: 'blocks' };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Auth error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockRejectedValue(mockUnauthorizedError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedHandleError).toHaveBeenCalledWith(mockUnauthorizedError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle permission errors', async () => {
        const input = { fromIssue: 'PRIVATE-1', toIssue: 'PRIVATE-2', linkType: 'blocks' };
        const permissionError = {
          response: {
            status: 403,
            data: {
              errorMessages: ['You do not have permission to link issues in this project'],
            },
          },
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Permission error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockRejectedValue(permissionError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedHandleError).toHaveBeenCalledWith(permissionError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle issue not found errors', async () => {
        const input = { fromIssue: 'NOTFOUND-123', toIssue: 'TEST-456', linkType: 'blocks' };
        const notFoundError = {
          response: {
            status: 404,
            data: { errorMessages: ['Issue does not exist'] },
          },
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Not found error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockRejectedValue(notFoundError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedHandleError).toHaveBeenCalledWith(notFoundError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle link already exists errors', async () => {
        const input = { fromIssue: 'TEST-1', toIssue: 'TEST-2', linkType: 'blocks' };
        const linkExistsError = {
          response: {
            status: 400,
            data: { errorMessages: ['A link of this type already exists'] },
          },
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Link exists error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockRejectedValue(linkExistsError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedHandleError).toHaveBeenCalledWith(linkExistsError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle network errors', async () => {
        const input = { fromIssue: 'TEST-123', toIssue: 'TEST-456', linkType: 'blocks' };
        const networkError = new Error('Network Error');
        (networkError as any).code = 'ECONNREFUSED';
        const mockErrorResponse = { content: [{ type: 'text', text: 'Network error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockRejectedValue(networkError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(input);

        expect(mockedHandleError).toHaveBeenCalledWith(networkError);
        expect(result).toEqual(mockErrorResponse);
      });
    });

    describe('Edge Cases', () => {
      it('should handle same issue being linked to itself', async () => {
        const input = { fromIssue: 'TEST-123', toIssue: 'TEST-123', linkType: 'relates' };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith('TEST-123', 'TEST-123', 'relates');
      });

      it('should handle issue keys with different project prefixes', async () => {
        const input = { fromIssue: 'PROJECT-1', toIssue: 'ANOTHERPROJECT-2', linkType: 'blocks' };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith(
          'PROJECT-1',
          'ANOTHERPROJECT-2',
          'blocks'
        );
      });

      it('should handle long issue keys', async () => {
        const input = {
          fromIssue: 'VERYLONGPROJECTNAME-12345',
          toIssue: 'ANOTHERVERYLONGPROJECTNAME-67890',
          linkType: 'blocks',
        };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith(
          'VERYLONGPROJECTNAME-12345',
          'ANOTHERVERYLONGPROJECTNAME-67890',
          'blocks'
        );
      });

      it('should handle link type variations (relates to)', async () => {
        const input = { fromIssue: 'TEST-1', toIssue: 'TEST-2', linkType: 'relates to' };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith('TEST-1', 'TEST-2', 'relates to');
      });

      it('should handle link type variations (is duplicated by)', async () => {
        const input = { fromIssue: 'TEST-1', toIssue: 'TEST-2', linkType: 'is duplicated by' };
        const mockResponse = { content: [{ type: 'text', text: 'Link created' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedCreateIssueLink.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        await handleCreateIssueLink(input);

        expect(mockedCreateIssueLink).toHaveBeenCalledWith('TEST-1', 'TEST-2', 'is duplicated by');
      });

      it('should handle null input', async () => {
        const validationError = new Error('Input cannot be null');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleCreateIssueLink(null);

        expect(result).toEqual(mockErrorResponse);
      });
    });
  });
});
