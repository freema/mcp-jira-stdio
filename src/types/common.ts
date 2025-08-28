import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface JiraAuthConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

export interface JiraErrorResponse {
  errorMessages?: string[];
  errors?: Record<string, string>;
  warningMessages?: string[];
}

export interface McpToolResponse extends CallToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface PaginatedResponse<T> {
  startAt: number;
  maxResults: number;
  total: number;
  isLast: boolean;
  values: T[];
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: any) => boolean;
}
