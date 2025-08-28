import { z, ZodSchema } from 'zod';
import { ERROR_MESSAGES } from '../config/constants.js';

export function validateInput<T>(schema: ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`${ERROR_MESSAGES.VALIDATION_ERROR}\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

export function isValidIssueKey(key: string): boolean {
  // Jira issue key format: PROJECT-123
  return /^[A-Z][A-Z0-9]*-\d+$/.test(key);
}

export function isValidProjectKey(key: string): boolean {
  // Jira project key format: uppercase letters and numbers, max 10 chars
  return /^[A-Z][A-Z0-9]{0,9}$/.test(key);
}

export function isValidJQL(jql: string): boolean {
  // Basic JQL validation - non-empty string
  return typeof jql === 'string' && jql.trim().length > 0;
}

export function sanitizeJQL(jql: string): string {
  // Remove potentially dangerous characters and normalize whitespace
  return jql
    .replace(/[<>"'`]/g, '') // Remove potentially dangerous chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export function validatePagination(startAt: number, maxResults: number): void {
  if (startAt < 0) {
    throw new Error('startAt must be non-negative');
  }
  if (maxResults < 1 || maxResults > 100) {
    throw new Error('maxResults must be between 1 and 100');
  }
}

// Extract a Jira issue key from a free-form string or URL
export function extractIssueKey(input: string): string | null {
  if (typeof input !== 'string') return null;
  const match = input.match(/[A-Z][A-Z0-9]*-\d+/);
  return match ? match[0] : null;
}
