import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  validateInput,
  isValidIssueKey,
  isValidProjectKey,
  isValidJQL,
  sanitizeJQL,
  validatePagination,
} from '../../../src/utils/validators.js';
import { ERROR_MESSAGES } from '../../../src/config/constants.js';

describe('validators', () => {
  describe('validateInput', () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number().min(0),
      email: z.string().email(),
    });

    it('should validate valid input successfully', () => {
      const input = { name: 'John', age: 30, email: 'john@example.com' };
      const result = validateInput(testSchema, input);
      expect(result).toEqual(input);
    });

    it('should throw validation error for invalid input', () => {
      const input = { name: 'John', age: -5, email: 'invalid-email' };
      expect(() => validateInput(testSchema, input)).toThrow(ERROR_MESSAGES.VALIDATION_ERROR);
    });

    it('should throw validation error with detailed field errors', () => {
      const input = { name: '', age: -5, email: 'invalid-email' };
      expect(() => validateInput(testSchema, input)).toThrow(ERROR_MESSAGES.VALIDATION_ERROR);
    });

    it('should handle missing required fields', () => {
      const input = { age: 30 };
      expect(() => validateInput(testSchema, input)).toThrow('name: Required');
      expect(() => validateInput(testSchema, input)).toThrow('email: Required');
    });

    it('should rethrow non-zod errors', () => {
      const mockError = new Error('Non-zod error');
      const mockSchema = {
        parse: () => {
          throw mockError;
        },
      } as any;
      
      expect(() => validateInput(mockSchema, {})).toThrow(mockError);
    });
  });

  describe('isValidIssueKey', () => {
    it('should validate correct issue keys', () => {
      expect(isValidIssueKey('PROJECT-123')).toBe(true);
      expect(isValidIssueKey('ABC-1')).toBe(true);
      expect(isValidIssueKey('TEST123-456')).toBe(true);
      expect(isValidIssueKey('A-1')).toBe(true);
    });

    it('should reject invalid issue keys', () => {
      expect(isValidIssueKey('project-123')).toBe(false); // lowercase
      expect(isValidIssueKey('PROJECT_123')).toBe(false); // underscore
      expect(isValidIssueKey('PROJECT-')).toBe(false); // no number
      expect(isValidIssueKey('-123')).toBe(false); // no project
      expect(isValidIssueKey('PROJECT-ABC')).toBe(false); // letters instead of number
      expect(isValidIssueKey('123-PROJECT')).toBe(false); // reversed format
      expect(isValidIssueKey('')).toBe(false); // empty
      expect(isValidIssueKey('PROJECT123')).toBe(false); // no hyphen
    });
  });

  describe('isValidProjectKey', () => {
    it('should validate correct project keys', () => {
      expect(isValidProjectKey('PROJECT')).toBe(true);
      expect(isValidProjectKey('ABC')).toBe(true);
      expect(isValidProjectKey('TEST123')).toBe(true);
      expect(isValidProjectKey('A')).toBe(true);
      expect(isValidProjectKey('A1B2C3D4E5')).toBe(true); // 10 chars max
    });

    it('should reject invalid project keys', () => {
      expect(isValidProjectKey('project')).toBe(false); // lowercase
      expect(isValidProjectKey('PROJECT_KEY')).toBe(false); // underscore
      expect(isValidProjectKey('PROJECT-KEY')).toBe(false); // hyphen
      expect(isValidProjectKey('1PROJECT')).toBe(false); // starts with number
      expect(isValidProjectKey('PROJECT KEY')).toBe(false); // space
      expect(isValidProjectKey('')).toBe(false); // empty
      expect(isValidProjectKey('PROJECTKEY1')).toBe(false); // too long (11 chars)
    });
  });

  describe('isValidJQL', () => {
    it('should validate non-empty JQL strings', () => {
      expect(isValidJQL('project = "TEST"')).toBe(true);
      expect(isValidJQL('assignee = currentUser()')).toBe(true);
      expect(isValidJQL('status = "Open" AND priority = "High"')).toBe(true);
      expect(isValidJQL('  spaced query  ')).toBe(true);
    });

    it('should reject invalid JQL', () => {
      expect(isValidJQL('')).toBe(false);
      expect(isValidJQL('   ')).toBe(false); // only whitespace
      expect(isValidJQL(null as any)).toBe(false);
      expect(isValidJQL(undefined as any)).toBe(false);
      expect(isValidJQL(123 as any)).toBe(false);
    });
  });

  describe('sanitizeJQL', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeJQL('project = "TEST<script>"')).toBe('project = TESTscript');
      expect(sanitizeJQL('summary ~ "test\'s"')).toBe('summary ~ tests');
      expect(sanitizeJQL('description ~ "test`back`"')).toBe('description ~ testback');
    });

    it('should normalize whitespace', () => {
      expect(sanitizeJQL('project    =     "TEST"')).toBe('project = TEST');
      expect(sanitizeJQL('  \t  query  \n  \r  ')).toBe('query');
      expect(sanitizeJQL('multiple\n\nlines\tof\rtext')).toBe('multiple lines of text');
    });

    it('should handle empty and whitespace-only strings', () => {
      expect(sanitizeJQL('')).toBe('');
      expect(sanitizeJQL('   ')).toBe('');
      expect(sanitizeJQL('\t\n\r')).toBe('');
    });

    it('should preserve valid JQL syntax', () => {
      expect(sanitizeJQL('project = TEST AND status = Open')).toBe('project = TEST AND status = Open');
      expect(sanitizeJQL('assignee in (user1, user2)')).toBe('assignee in (user1, user2)');
    });
  });

  describe('validatePagination', () => {
    it('should accept valid pagination parameters', () => {
      expect(() => validatePagination(0, 1)).not.toThrow();
      expect(() => validatePagination(0, 50)).not.toThrow();
      expect(() => validatePagination(10, 100)).not.toThrow();
      expect(() => validatePagination(100, 25)).not.toThrow();
    });

    it('should reject negative startAt values', () => {
      expect(() => validatePagination(-1, 50)).toThrow('startAt must be non-negative');
      expect(() => validatePagination(-100, 50)).toThrow('startAt must be non-negative');
    });

    it('should reject invalid maxResults values', () => {
      expect(() => validatePagination(0, 0)).toThrow('maxResults must be between 1 and 100');
      expect(() => validatePagination(0, -5)).toThrow('maxResults must be between 1 and 100');
      expect(() => validatePagination(0, 101)).toThrow('maxResults must be between 1 and 100');
      expect(() => validatePagination(0, 200)).toThrow('maxResults must be between 1 and 100');
    });

    it('should accept boundary values', () => {
      expect(() => validatePagination(0, 1)).not.toThrow(); // min maxResults
      expect(() => validatePagination(0, 100)).not.toThrow(); // max maxResults
      expect(() => validatePagination(0, 50)).not.toThrow(); // typical value
    });
  });
});