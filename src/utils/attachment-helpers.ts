import { AxiosRequestConfig } from 'axios';
import { makeJiraRequest } from './jira-auth.js';
import type { JiraAttachment, JiraIssue } from '../types/jira.js';
import { getIssue } from './api-helpers.js';
import { createLogger } from './logger.js';

const log = createLogger('attachment-helpers');

/**
 * Get attachment metadata by ID
 */
export async function getAttachmentMetadata(attachmentId: string): Promise<JiraAttachment> {
  log.info(`Getting attachment metadata for ID: ${attachmentId}`);

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: `/attachment/${attachmentId}`,
  };

  return await makeJiraRequest<JiraAttachment>(config);
}

/**
 * Download attachment content as Buffer
 */
export async function getAttachmentContent(
  attachmentId: string,
  isThumbnail = false
): Promise<Buffer> {
  log.info(
    `Downloading attachment ${isThumbnail ? 'thumbnail' : 'content'} for ID: ${attachmentId}`
  );

  const endpoint = isThumbnail
    ? `/attachment/thumbnail/${attachmentId}`
    : `/attachment/content/${attachmentId}`;

  const config: AxiosRequestConfig = {
    method: 'GET',
    url: endpoint,
    responseType: 'arraybuffer',
  };

  const data = await makeJiraRequest<ArrayBuffer>(config);
  return Buffer.from(data);
}

/**
 * Get all attachments for an issue
 */
export async function listIssueAttachments(issueKey: string): Promise<JiraAttachment[]> {
  log.info(`Listing attachments for issue: ${issueKey}`);

  const issue: JiraIssue = await getIssue(issueKey, {
    expand: ['attachment'],
  });

  return issue.fields.attachment || [];
}

/**
 * Convert Buffer to base64 string
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Parse attachment URI: jira://attachment/{id} or jira://attachment/{id}/thumbnail
 * Returns { attachmentId, isThumbnail }
 */
export function parseAttachmentUri(
  uri: string
): { attachmentId: string; isThumbnail: boolean } | null {
  const normalMatch = uri.match(/^jira:\/\/attachment\/([^/]+)$/);
  if (normalMatch) {
    return { attachmentId: normalMatch[1] as string, isThumbnail: false };
  }

  const thumbnailMatch = uri.match(/^jira:\/\/attachment\/([^/]+)\/thumbnail$/);
  if (thumbnailMatch) {
    return { attachmentId: thumbnailMatch[1] as string, isThumbnail: true };
  }

  return null;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
