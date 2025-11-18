import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleLinkIssues, linkIssuesTool } from '../../../src/tools/link-issues.js';
import { validateInput } from '../../../src/utils/validators.js';
import { linkIssues } from '../../../src/utils/api-helpers.js';
import { formatSuccessResponse } from '../../../src/utils/formatters.js';
import { handleError } from '../../../src/utils/error-handler.js';
import { TOOL_NAMES } from '../../../src/config/constants.js';

// Mock dependencies
vi.mock('../../../src/utils/validators.js');
vi.mock('../../../src/utils/api-helpers.js');
vi.mock('../../../src/utils/formatters.js');
vi.mock('../../../src/utils/error-handler.js');

const mockedValidateInput = vi.mocked(validateInput);
const mockedLinkIssues = vi.mocked(linkIssues);
const mockedFormatSuccessResponse = vi.mocked(formatSuccessResponse);
const mockedHandleError = vi.mocked(handleError);

describe('link-issues tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('linkIssuesTool configuration', () => {
    it('should have correct tool configuration', () => {
      expect(linkIssuesTool.name).toBe(TOOL_NAMES.LINK_ISSUES);
      expect(linkIssuesTool.description).toContain('Creates a link between two Jira issues');
      expect(linkIssuesTool.inputSchema.type).toBe('object');
      expect(linkIssuesTool.inputSchema.required).toEqual([
        'inwardIssueKey',
        'outwardIssueKey',
        'linkType',
      ]);

      // Check required fields
      expect(linkIssuesTool.inputSchema.properties.inwardIssueKey).toBeDefined();
      expect(linkIssuesTool.inputSchema.properties.outwardIssueKey).toBeDefined();
      expect(linkIssuesTool.inputSchema.properties.linkType).toBeDefined();

      // Check optional fields
      expect(linkIssuesTool.inputSchema.properties.comment).toBeDefined();
    });
  });

  describe('handleLinkIssues', () => {
    describe('Success Cases', () => {
      it('should link issues with required fields only', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
        };
        const validatedInput = { ...input };
        const mockResponse = {
          content: [
            {
              type: 'text',
              text: 'Successfully linked PROJECT-123 to PROJECT-456 (Blocks)',
            },
          ],
        };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedLinkIssues.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        const result = await handleLinkIssues(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(expect.any(Object), input);
        expect(mockedLinkIssues).toHaveBeenCalledWith(
          'PROJECT-123',
          'PROJECT-456',
          'Blocks',
          undefined
        );
        expect(mockedFormatSuccessResponse).toHaveBeenCalledWith(
          'Successfully linked PROJECT-123 to PROJECT-456 (Blocks)'
        );
        expect(result).toEqual(mockResponse);
      });

      it('should link issues with comment', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Relates',
          comment: 'These issues are related',
        };
        const validatedInput = { ...input };
        const mockResponse = {
          content: [
            {
              type: 'text',
              text: 'Successfully linked PROJECT-123 to PROJECT-456 (Relates) with comment',
            },
          ],
        };

        mockedValidateInput.mockReturnValue(validatedInput);
        mockedLinkIssues.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue(mockResponse);

        const result = await handleLinkIssues(input);

        expect(mockedLinkIssues).toHaveBeenCalledWith(
          'PROJECT-123',
          'PROJECT-456',
          'Relates',
          'These issues are related'
        );
        expect(mockedFormatSuccessResponse).toHaveBeenCalledWith(
          'Successfully linked PROJECT-123 to PROJECT-456 (Relates) with comment'
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle different link types', async () => {
        const linkTypes = ['Blocks', 'Relates', 'Duplicates', 'Clones'];

        for (const linkType of linkTypes) {
          vi.clearAllMocks();
          const input = {
            inwardIssueKey: 'PROJ-1',
            outwardIssueKey: 'PROJ-2',
            linkType,
          };

          mockedValidateInput.mockReturnValue(input);
          mockedLinkIssues.mockResolvedValue(undefined);
          mockedFormatSuccessResponse.mockReturnValue({ content: [] });

          await handleLinkIssues(input);

          expect(mockedLinkIssues).toHaveBeenCalledWith('PROJ-1', 'PROJ-2', linkType, undefined);
        }
      });

      it('should handle different project keys', async () => {
        const input = {
          inwardIssueKey: 'ALPHA-100',
          outwardIssueKey: 'BETA-200',
          linkType: 'Blocks',
        };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue({ content: [] });

        await handleLinkIssues(input);

        expect(mockedLinkIssues).toHaveBeenCalledWith('ALPHA-100', 'BETA-200', 'Blocks', undefined);
      });

      it('should handle long comments', async () => {
        const longComment = 'A'.repeat(500) + '\n' + 'B'.repeat(500);
        const input = {
          inwardIssueKey: 'PROJ-1',
          outwardIssueKey: 'PROJ-2',
          linkType: 'Relates',
          comment: longComment,
        };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue({ content: [] });

        await handleLinkIssues(input);

        expect(mockedLinkIssues).toHaveBeenCalledWith('PROJ-1', 'PROJ-2', 'Relates', longComment);
      });
    });

    describe('Validation', () => {
      it('should validate input using schema', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
        };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue({ content: [] });

        await handleLinkIssues(input);

        expect(mockedValidateInput).toHaveBeenCalledWith(
          expect.objectContaining({
            _def: expect.objectContaining({
              typeName: 'ZodObject',
            }),
          }),
          input
        );
      });

      it('should handle validation errors for missing required fields', async () => {
        const input = { inwardIssueKey: 'PROJECT-123' }; // missing outwardIssueKey and linkType
        const validationError = new Error(
          'Validation failed: outwardIssueKey is required, linkType is required'
        );
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for invalid issue key format', async () => {
        const input = {
          inwardIssueKey: 'invalid-key',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
        };
        const validationError = new Error('Invalid issue key format');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle validation errors for empty linkType', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: '',
        };
        const validationError = new Error(
          'Validation failed: linkType must be at least 1 character'
        );
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });
    });

    describe('Error Handling', () => {
      it('should handle API errors from linkIssues', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
        };
        const apiError = {
          response: {
            status: 400,
            data: { errorMessages: ['Invalid link type'] },
          },
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'API error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockRejectedValue(apiError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(apiError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle authentication errors', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
        };
        const authError = { response: { status: 401, data: { errorMessages: ['Unauthorized'] } } };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Auth error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockRejectedValue(authError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(authError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle permission errors', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
        };
        const permissionError = {
          response: {
            status: 403,
            data: { errorMessages: ['Insufficient permissions to link issues'] },
          },
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Permission error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockRejectedValue(permissionError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(permissionError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle issue not found errors', async () => {
        const input = {
          inwardIssueKey: 'NONEXISTENT-999',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
        };
        const notFoundError = {
          response: {
            status: 404,
            data: { errorMessages: ['Issue not found'] },
          },
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Not found error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockRejectedValue(notFoundError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(notFoundError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle network errors', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
        };
        const networkError = new Error('Network Error');
        (networkError as any).code = 'ECONNREFUSED';
        const mockErrorResponse = { content: [{ type: 'text', text: 'Network error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockRejectedValue(networkError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(networkError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle rate limit errors', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
        };
        const rateLimitError = {
          response: {
            status: 429,
            data: { errorMessages: ['Rate limit exceeded'] },
          },
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Rate limit error' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockRejectedValue(rateLimitError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(rateLimitError);
        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle invalid link type errors', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'InvalidLinkType',
        };
        const invalidLinkTypeError = {
          response: {
            status: 400,
            data: {
              errorMessages: ['The issue link type with name "InvalidLinkType" does not exist.'],
            },
          },
        };
        const mockErrorResponse = { content: [{ type: 'text', text: 'Invalid link type' }] };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockRejectedValue(invalidLinkTypeError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(input);

        expect(mockedHandleError).toHaveBeenCalledWith(invalidLinkTypeError);
        expect(result).toEqual(mockErrorResponse);
      });
    });

    describe('Edge Cases', () => {
      it('should handle linking same issue to itself (if allowed by Jira)', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-123',
          linkType: 'Relates',
        };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue({ content: [] });

        await handleLinkIssues(input);

        expect(mockedLinkIssues).toHaveBeenCalledWith(
          'PROJECT-123',
          'PROJECT-123',
          'Relates',
          undefined
        );
      });

      it('should handle special characters in comments', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
          comment: 'Special chars: äöü@#$%& and\nnewlines\ttabs',
        };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue({ content: [] });

        await handleLinkIssues(input);

        expect(mockedLinkIssues).toHaveBeenCalledWith(
          'PROJECT-123',
          'PROJECT-456',
          'Blocks',
          'Special chars: äöü@#$%& and\nnewlines\ttabs'
        );
      });

      it('should handle null input', async () => {
        const validationError = new Error('Input cannot be null');
        const mockErrorResponse = { content: [{ type: 'text', text: 'Validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handleLinkIssues(null);

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

        const result = await handleLinkIssues(input);

        expect(result).toEqual(mockErrorResponse);
      });

      it('should handle undefined comment field', async () => {
        const input = {
          inwardIssueKey: 'PROJECT-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
          comment: undefined,
        };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue({ content: [] });

        await handleLinkIssues(input);

        expect(mockedLinkIssues).toHaveBeenCalledWith(
          'PROJECT-123',
          'PROJECT-456',
          'Blocks',
          undefined
        );
      });

      it('should handle issue keys with lowercase letters', async () => {
        const input = {
          inwardIssueKey: 'project-123',
          outwardIssueKey: 'PROJECT-456',
          linkType: 'Blocks',
        };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue({ content: [] });

        await handleLinkIssues(input);

        expect(mockedLinkIssues).toHaveBeenCalledWith(
          'project-123',
          'PROJECT-456',
          'Blocks',
          undefined
        );
      });

      it('should handle issue keys with long project names', async () => {
        const input = {
          inwardIssueKey: 'VERYLONGPROJECTNAME-1',
          outwardIssueKey: 'ANOTHERLONGPROJECT-2',
          linkType: 'Relates',
        };

        mockedValidateInput.mockReturnValue(input);
        mockedLinkIssues.mockResolvedValue(undefined);
        mockedFormatSuccessResponse.mockReturnValue({ content: [] });

        await handleLinkIssues(input);

        expect(mockedLinkIssues).toHaveBeenCalledWith(
          'VERYLONGPROJECTNAME-1',
          'ANOTHERLONGPROJECT-2',
          'Relates',
          undefined
        );
      });
    });
  });
});
