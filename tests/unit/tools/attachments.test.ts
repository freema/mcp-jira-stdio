import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  handleAddAttachment,
  addAttachmentTool,
  handleGetAttachments,
  getAttachmentsTool,
  handleDeleteAttachment,
  deleteAttachmentTool,
} from '../../../src/tools/index.js';
import { validateInput } from '../../../src/utils/validators.js';
import {
  addAttachment,
  getAttachments,
  deleteAttachment,
} from '../../../src/utils/api-helpers.js';
import {
  formatAttachmentResponse,
  formatAttachmentsListResponse,
} from '../../../src/utils/formatters.js';
import { handleError } from '../../../src/utils/error-handler.js';
import {
  mockJiraAttachment,
  mockJiraAttachmentList,
  mockUnauthorizedError,
  mockNotFoundError,
} from '../../mocks/jira-responses.js';
import { TOOL_NAMES } from '../../../src/config/constants.js';

// Mock all dependencies
vi.mock('../../../src/utils/validators.js');
vi.mock('../../../src/utils/api-helpers.js');
vi.mock('../../../src/utils/formatters.js');
vi.mock('../../../src/utils/error-handler.js');

const mockedValidateInput = vi.mocked(validateInput);
const mockedAddAttachment = vi.mocked(addAttachment);
const mockedGetAttachments = vi.mocked(getAttachments);
const mockedDeleteAttachment = vi.mocked(deleteAttachment);
const mockedFormatAttachmentResponse = vi.mocked(formatAttachmentResponse);
const mockedFormatAttachmentsListResponse = vi.mocked(formatAttachmentsListResponse);
const mockedHandleError = vi.mocked(handleError);

describe('Attachment Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Add Attachment Tool', () => {
    it('should have correct configuration', () => {
      expect(addAttachmentTool.name).toBe(TOOL_NAMES.ADD_ATTACHMENT);
      expect(addAttachmentTool.description).toContain('Uploads an attachment');
      expect(addAttachmentTool.inputSchema.required).toEqual(['issueKey', 'filename', 'content']);
    });

    it('should handle successful attachment upload', async () => {
      const input = {
        issueKey: 'TEST-123',
        filename: 'screenshot.png',
        content: 'base64encodedcontent',
        isBase64: true,
      };
      const mockResponse = { content: [{ type: 'text', text: 'attachment uploaded' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedAddAttachment.mockResolvedValue([mockJiraAttachment]);
      mockedFormatAttachmentResponse.mockReturnValue(mockResponse);

      const result = await handleAddAttachment(input);

      expect(mockedAddAttachment).toHaveBeenCalledWith(
        'TEST-123',
        'screenshot.png',
        'base64encodedcontent',
        true
      );
      expect(mockedFormatAttachmentResponse).toHaveBeenCalledWith(mockJiraAttachment, 'TEST-123');
      expect(result).toEqual(mockResponse);
    });

    it('should handle plain text file upload', async () => {
      const input = {
        issueKey: 'TEST-123',
        filename: 'notes.txt',
        content: 'Plain text content',
        isBase64: false,
      };

      mockedValidateInput.mockReturnValue(input);
      mockedAddAttachment.mockResolvedValue([mockJiraAttachment]);
      mockedFormatAttachmentResponse.mockReturnValue({ content: [] });

      await handleAddAttachment(input);

      expect(mockedAddAttachment).toHaveBeenCalledWith(
        'TEST-123',
        'notes.txt',
        'Plain text content',
        false
      );
    });

    it('should handle empty attachment response', async () => {
      const input = {
        issueKey: 'TEST-123',
        filename: 'test.png',
        content: 'content',
        isBase64: true,
      };
      const mockErrorResponse = { content: [{ type: 'text', text: 'error' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedAddAttachment.mockResolvedValue([]);
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleAddAttachment(input);

      expect(mockedHandleError).toHaveBeenCalled();
      expect(result).toEqual(mockErrorResponse);
    });

    it('should handle API errors', async () => {
      const mockErrorResponse = { content: [{ type: 'text', text: 'api error' }] };

      mockedValidateInput.mockReturnValue({
        issueKey: 'TEST-123',
        filename: 'test.png',
        content: 'content',
        isBase64: true,
      });
      mockedAddAttachment.mockRejectedValue(mockUnauthorizedError);
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleAddAttachment({});

      expect(mockedHandleError).toHaveBeenCalledWith(mockUnauthorizedError);
      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('Get Attachments Tool', () => {
    it('should have correct configuration', () => {
      expect(getAttachmentsTool.name).toBe(TOOL_NAMES.GET_ATTACHMENTS);
      expect(getAttachmentsTool.description).toContain('Lists all attachments');
      expect(getAttachmentsTool.inputSchema.required).toEqual(['issueKey']);
    });

    it('should handle successful attachments retrieval', async () => {
      const input = { issueKey: 'TEST-123' };
      const mockResponse = { content: [{ type: 'text', text: 'attachments list' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedGetAttachments.mockResolvedValue(mockJiraAttachmentList);
      mockedFormatAttachmentsListResponse.mockReturnValue(mockResponse);

      const result = await handleGetAttachments(input);

      expect(mockedGetAttachments).toHaveBeenCalledWith('TEST-123');
      expect(mockedFormatAttachmentsListResponse).toHaveBeenCalledWith(
        mockJiraAttachmentList,
        'TEST-123'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty attachments list', async () => {
      const input = { issueKey: 'TEST-123' };
      const mockResponse = { content: [{ type: 'text', text: 'no attachments' }] };

      mockedValidateInput.mockReturnValue(input);
      mockedGetAttachments.mockResolvedValue([]);
      mockedFormatAttachmentsListResponse.mockReturnValue(mockResponse);

      const result = await handleGetAttachments(input);

      expect(mockedFormatAttachmentsListResponse).toHaveBeenCalledWith([], 'TEST-123');
      expect(result).toEqual(mockResponse);
    });

    it('should handle issue not found error', async () => {
      const mockErrorResponse = { content: [{ type: 'text', text: 'not found' }] };

      mockedValidateInput.mockReturnValue({ issueKey: 'INVALID-999' });
      mockedGetAttachments.mockRejectedValue(mockNotFoundError);
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleGetAttachments({ issueKey: 'INVALID-999' });

      expect(mockedHandleError).toHaveBeenCalledWith(mockNotFoundError);
      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('Delete Attachment Tool', () => {
    it('should have correct configuration', () => {
      expect(deleteAttachmentTool.name).toBe(TOOL_NAMES.DELETE_ATTACHMENT);
      expect(deleteAttachmentTool.description).toContain('Deletes an attachment');
      expect(deleteAttachmentTool.inputSchema.required).toEqual(['attachmentId']);
    });

    it('should handle successful attachment deletion', async () => {
      const input = { attachmentId: 'test-attachment-id-123' };

      mockedValidateInput.mockReturnValue(input);
      mockedDeleteAttachment.mockResolvedValue(undefined);

      const result = await handleDeleteAttachment(input);

      expect(mockedDeleteAttachment).toHaveBeenCalledWith('test-attachment-id-123');
      expect(result.content[0].text).toContain('Successfully deleted attachment');
    });

    it('should handle attachment not found error', async () => {
      const mockErrorResponse = { content: [{ type: 'text', text: 'not found' }] };

      mockedValidateInput.mockReturnValue({ attachmentId: 'invalid-id' });
      mockedDeleteAttachment.mockRejectedValue(mockNotFoundError);
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleDeleteAttachment({ attachmentId: 'invalid-id' });

      expect(mockedHandleError).toHaveBeenCalledWith(mockNotFoundError);
      expect(result).toEqual(mockErrorResponse);
    });

    it('should handle unauthorized error', async () => {
      const mockErrorResponse = { content: [{ type: 'text', text: 'unauthorized' }] };

      mockedValidateInput.mockReturnValue({ attachmentId: 'test-id' });
      mockedDeleteAttachment.mockRejectedValue(mockUnauthorizedError);
      mockedHandleError.mockReturnValue(mockErrorResponse);

      const result = await handleDeleteAttachment({ attachmentId: 'test-id' });

      expect(mockedHandleError).toHaveBeenCalledWith(mockUnauthorizedError);
      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('Error Handling for All Attachment Tools', () => {
    const tools = [
      { handler: handleAddAttachment, name: 'Add Attachment', mockFn: mockedAddAttachment },
      { handler: handleGetAttachments, name: 'Get Attachments', mockFn: mockedGetAttachments },
      { handler: handleDeleteAttachment, name: 'Delete Attachment', mockFn: mockedDeleteAttachment },
    ];

    tools.forEach(({ handler, name, mockFn }) => {
      it(`should handle validation errors in ${name}`, async () => {
        const validationError = new Error('Validation failed');
        const mockErrorResponse = { content: [{ type: 'text', text: 'validation error' }] };

        mockedValidateInput.mockImplementation(() => {
          throw validationError;
        });
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handler({});

        expect(mockedHandleError).toHaveBeenCalledWith(validationError);
        expect(result).toEqual(mockErrorResponse);
      });

      it(`should handle network errors in ${name}`, async () => {
        const networkError = new Error('Network Error');
        (networkError as any).code = 'ECONNREFUSED';
        const mockErrorResponse = { content: [{ type: 'text', text: 'network error' }] };

        mockedValidateInput.mockReturnValue({
          issueKey: 'TEST-123',
          attachmentId: 'test-id',
          filename: 'test.png',
          content: 'content',
          isBase64: true,
        });
        mockFn.mockRejectedValue(networkError);
        mockedHandleError.mockReturnValue(mockErrorResponse);

        const result = await handler({});

        expect(mockedHandleError).toHaveBeenCalledWith(networkError);
        expect(result).toEqual(mockErrorResponse);
      });
    });
  });
});
