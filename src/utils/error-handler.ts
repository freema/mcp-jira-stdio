import { McpToolResponse } from '../types/common.js';
import { formatErrorResponse } from './formatters.js';
import { ERROR_MESSAGES } from '../config/constants.js';

export class JiraApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public jiraErrors?: string[],
    public originalError?: any
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

export function handleError(error: any): McpToolResponse {
  console.error('Tool error:', error);

  // Handle known error types
  if (error instanceof JiraApiError) {
    return formatErrorResponse(error.message);
  }

  if (error?.response?.status === 401) {
    return formatErrorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  if (error?.response?.status === 404) {
    return formatErrorResponse('Resource not found or insufficient permissions');
  }

  if (error?.response?.status === 429) {
    return formatErrorResponse(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
  }

  if (!error?.response && error?.code === 'ECONNREFUSED') {
    return formatErrorResponse(ERROR_MESSAGES.NETWORK_ERROR);
  }

  // Handle validation errors
  if (error?.message?.includes('validation')) {
    return formatErrorResponse(error.message);
  }

  // Handle Jira API errors
  if (error?.response?.data) {
    const jiraError = error.response.data;

    if (jiraError.errorMessages && jiraError.errorMessages.length > 0) {
      return formatErrorResponse(jiraError.errorMessages.join(', '));
    }

    if (jiraError.errors) {
      const errorDetails = Object.entries(jiraError.errors)
        .map(([field, message]) => `${field}: ${message}`)
        .join(', ');
      return formatErrorResponse(errorDetails);
    }
  }

  // Default error handling
  const message = error?.message || 'An unexpected error occurred';
  return formatErrorResponse(message);
}

export function createJiraApiError(error: any): JiraApiError {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    let message = `Jira API error (${status})`;
    let jiraErrors: string[] = [];

    if (data?.errorMessages) {
      jiraErrors = data.errorMessages;
      message = data.errorMessages.join(', ');
    } else if (data?.errors) {
      jiraErrors = Object.values(data.errors);
      message = Object.entries(data.errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
    }

    return new JiraApiError(message, status, jiraErrors, error);
  }

  if (error.code === 'ECONNREFUSED') {
    return new JiraApiError(ERROR_MESSAGES.NETWORK_ERROR, undefined, [], error);
  }

  return new JiraApiError(error.message || 'Unknown Jira API error', undefined, [], error);
}
