import { vi } from 'vitest';

// Setup global test environment
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset environment variables
  process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
  process.env.JIRA_EMAIL = 'test@example.com';
  process.env.JIRA_API_TOKEN = 'test-api-token';
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Clean up any remaining mocks
  vi.restoreAllMocks();
});

// Global test utilities
global.console.error = vi.fn();