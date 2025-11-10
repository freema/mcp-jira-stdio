import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIssue, updateIssue, addComment } from '../../../src/utils/api-helpers.js';
import * as jiraAuth from '../../../src/utils/jira-auth.js';

vi.mock('../../../src/utils/jira-auth.js');
const mockedMakeJiraRequest = vi.mocked(jiraAuth.makeJiraRequest);

describe('Markdown Format Conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createIssue with markdown format', () => {
    it('should convert markdown to ADF when format is "markdown"', async () => {
      const mockResponse = { key: 'TEST-123', id: '123', self: 'url' };
      const mockIssue = { key: 'TEST-123', fields: {} };
      mockedMakeJiraRequest.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockIssue);

      await createIssue({
        projectKey: 'TEST',
        summary: 'Test',
        description: '# Heading\n\n**Bold text**',
        issueType: 'Task',
        format: 'markdown',
      });

      const call = mockedMakeJiraRequest.mock.calls[0][0];
      expect(call.data.fields.description).toBeDefined();
      expect(typeof call.data.fields.description).toBe('object');
      // Markdown conversion creates an ADF document structure
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

    it('should use markdown format by default', async () => {
      const mockResponse = { key: 'TEST-123', id: '123', self: 'url' };
      const mockIssue = { key: 'TEST-123', fields: {} };
      mockedMakeJiraRequest.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockIssue);

      await createIssue({
        projectKey: 'TEST',
        summary: 'Test',
        description: '# Heading',
        issueType: 'Task',
        // format not specified, should default to 'markdown'
      });

      const call = mockedMakeJiraRequest.mock.calls[0][0];
      expect(call.data.fields.description).toBeDefined();
      expect(typeof call.data.fields.description).toBe('object');
    });
  });

  describe('updateIssue with markdown format', () => {
    it('should convert markdown to ADF when format is "markdown"', async () => {
      mockedMakeJiraRequest.mockResolvedValue(undefined);

      await updateIssue('TEST-123', {
        description: '# Updated\n\n**Bold**',
        format: 'markdown',
      });

      const call = mockedMakeJiraRequest.mock.calls[0][0];
      expect(call.data.fields.description).toBeDefined();
      expect(typeof call.data.fields.description).toBe('object');
    });
  });

  describe('addComment with markdown format', () => {
    it('should convert markdown to ADF when format is "markdown"', async () => {
      const mockComment = { id: '1', body: {}, author: {} };
      mockedMakeJiraRequest.mockResolvedValue(mockComment);

      await addComment('TEST-123', '# Comment\n\n**Bold**', undefined, 'markdown');

      const call = mockedMakeJiraRequest.mock.calls[0][0];
      expect(call.data.body).toBeDefined();
      expect(typeof call.data.body).toBe('object');
    });
  });
});
