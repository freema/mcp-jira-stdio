import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIssue, updateIssue, addComment } from '../../../src/utils/api-helpers.js';
import * as jiraAuth from '../../../src/utils/jira-auth.js';
import mdToAdf from 'md-to-adf';

vi.mock('../../../src/utils/jira-auth.js');
vi.mock('md-to-adf');

const mockedMakeJiraRequest = vi.mocked(jiraAuth.makeJiraRequest);
const mockedMdToAdf = vi.mocked(mdToAdf);

describe('Markdown Format Conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createIssue with markdown format', () => {
    it('should convert markdown to ADF when format is "markdown"', async () => {
      const mockResponse = { key: 'TEST-123', id: '123', self: 'url' };
      const mockIssue = { key: 'TEST-123', fields: {} };
      const mockAdf = { type: 'doc', version: 1, content: [] };

      mockedMdToAdf.mockReturnValue(mockAdf);
      mockedMakeJiraRequest.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockIssue);

      await createIssue({
        projectKey: 'TEST',
        summary: 'Test',
        description: '# Heading\n\n**Bold text**',
        issueType: 'Task',
        format: 'markdown',
      });

      expect(mockedMdToAdf).toHaveBeenCalledWith('# Heading\n\n**Bold text**');
      const call = mockedMakeJiraRequest.mock.calls[0][0];
      expect(call.data.fields.description).toEqual(mockAdf);
    });

    it('should fallback to plain text when markdown conversion fails', async () => {
      const mockResponse = { key: 'TEST-123', id: '123', self: 'url' };
      const mockIssue = { key: 'TEST-123', fields: {} };

      mockedMdToAdf.mockImplementation(() => {
        throw new Error('Markdown parsing error');
      });
      mockedMakeJiraRequest.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockIssue);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await createIssue({
        projectKey: 'TEST',
        summary: 'Test',
        description: 'Simple text',
        issueType: 'Task',
        format: 'markdown',
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      const call = mockedMakeJiraRequest.mock.calls[0][0];
      // Should fall back to plain text conversion
      expect(call.data.fields.description).toMatchObject({
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Simple text' }],
          },
        ],
      });

      consoleWarnSpy.mockRestore();
    });

    it('should use plain text conversion when format is "plain"', async () => {
      const mockResponse = { key: 'TEST-123', id: '123', self: 'url' };
      const mockIssue = { key: 'TEST-123', fields: {} };
      mockedMakeJiraRequest.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockIssue);

      await createIssue({
        projectKey: 'TEST',
        summary: 'Test',
        description: 'Plain text',
        issueType: 'Task',
        format: 'plain',
      });

      expect(mockedMdToAdf).not.toHaveBeenCalled();
      const call = mockedMakeJiraRequest.mock.calls[0][0];
      expect(call.data.fields.description).toMatchObject({
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Plain text' }],
          },
        ],
      });
    });

    it('should return ADF object as-is when format is "adf"', async () => {
      const mockResponse = { key: 'TEST-123', id: '123', self: 'url' };
      const mockIssue = { key: 'TEST-123', fields: {} };
      const adfObject = { type: 'doc', version: 1, content: [] };

      mockedMakeJiraRequest.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockIssue);

      await createIssue({
        projectKey: 'TEST',
        summary: 'Test',
        description: adfObject,
        issueType: 'Task',
        format: 'adf',
      });

      expect(mockedMdToAdf).not.toHaveBeenCalled();
      const call = mockedMakeJiraRequest.mock.calls[0][0];
      expect(call.data.fields.description).toEqual(adfObject);
    });

    it('should return string as-is when format is "adf" and description is string', async () => {
      const mockResponse = { key: 'TEST-123', id: '123', self: 'url' };
      const mockIssue = { key: 'TEST-123', fields: {} };

      mockedMakeJiraRequest.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockIssue);

      await createIssue({
        projectKey: 'TEST',
        summary: 'Test',
        description: 'raw string',
        issueType: 'Task',
        format: 'adf',
      });

      expect(mockedMdToAdf).not.toHaveBeenCalled();
      const call = mockedMakeJiraRequest.mock.calls[0][0];
      expect(call.data.fields.description).toBe('raw string');
    });

    it('should use markdown format by default', async () => {
      const mockResponse = { key: 'TEST-123', id: '123', self: 'url' };
      const mockIssue = { key: 'TEST-123', fields: {} };
      const mockAdf = { type: 'doc', version: 1, content: [] };

      mockedMdToAdf.mockReturnValue(mockAdf);
      mockedMakeJiraRequest.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockIssue);

      await createIssue({
        projectKey: 'TEST',
        summary: 'Test',
        description: '# Heading',
        issueType: 'Task',
        // format not specified, should default to 'markdown'
      });

      expect(mockedMdToAdf).toHaveBeenCalledWith('# Heading');
    });
  });

  describe('updateIssue with markdown format', () => {
    it('should convert markdown to ADF when format is "markdown"', async () => {
      const mockAdf = { type: 'doc', version: 1, content: [] };
      mockedMdToAdf.mockReturnValue(mockAdf);
      mockedMakeJiraRequest.mockResolvedValue(undefined);

      await updateIssue('TEST-123', {
        description: '# Updated\n\n**Bold**',
        format: 'markdown',
      });

      expect(mockedMdToAdf).toHaveBeenCalledWith('# Updated\n\n**Bold**');
    });
  });

  describe('addComment with markdown format', () => {
    it('should convert markdown to ADF when format is "markdown"', async () => {
      const mockComment = { id: '1', body: {}, author: {} };
      const mockAdf = { type: 'doc', version: 1, content: [] };

      mockedMdToAdf.mockReturnValue(mockAdf);
      mockedMakeJiraRequest.mockResolvedValue(mockComment);

      await addComment('TEST-123', '# Comment\n\n**Bold**', undefined, 'markdown');

      expect(mockedMdToAdf).toHaveBeenCalledWith('# Comment\n\n**Bold**');
    });
  });
});
