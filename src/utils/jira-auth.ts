import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import { JiraAuthConfig, RetryConfig } from '../types/common.js';
import { JIRA_CONFIG, ERROR_MESSAGES } from '../config/constants.js';
import { createLogger } from './logger.js';
// keep client simple to match test expectations

let jiraClient: AxiosInstance | null = null;
let jiraMultipartClient: AxiosInstance | null = null;
const log = createLogger('jira-auth');

export function validateAuth(): JiraAuthConfig {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    throw new Error(ERROR_MESSAGES.AUTH_REQUIRED);
  }

  // Normalize base URL
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return {
    baseUrl: normalizedBaseUrl,
    email,
    apiToken,
  };
}

export function getAuthenticatedClient(): AxiosInstance {
  if (jiraClient) {
    return jiraClient;
  }

  const auth = validateAuth();

  jiraClient = axios.create({
    baseURL: `${auth.baseUrl}${JIRA_CONFIG.BASE_PATH}`,
    timeout: JIRA_CONFIG.DEFAULT_TIMEOUT,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    auth: {
      username: auth.email,
      password: auth.apiToken,
    },
  });

  // Add request interceptor for logging
  jiraClient.interceptors.request.use(
    (config) => {
      log.debug(`Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => {
      log.error('Request error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  jiraClient.interceptors.response.use(
    (response) => {
      log.debug(`Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      log.error(`Jira API error: ${error.response?.status} ${error.config?.url}`);

      if (error.response?.status === 401) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      } else if (error.response?.status === 404) {
        throw new Error('Resource not found or insufficient permissions');
      } else if (error.response?.status === 429) {
        throw new Error(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
      } else if (!error.response) {
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
      }

      return Promise.reject(error);
    }
  );

  return jiraClient;
}

export async function makeJiraRequest<T = any>(
  config: AxiosRequestConfig,
  retryConfig: RetryConfig = {
    maxRetries: JIRA_CONFIG.MAX_RETRIES,
    retryDelay: JIRA_CONFIG.RETRY_DELAY,
  }
): Promise<T> {
  const client = getAuthenticatedClient();
  let lastError: any;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await client.request<T>(config);
      return response.data;
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication or client errors
      if (
        error.response?.status === 401 ||
        error.response?.status === 403 ||
        error.response?.status === 404 ||
        (error.response?.status >= 400 &&
          error.response?.status < 500 &&
          error.response?.status !== 429)
      ) {
        break;
      }

      // Don't retry if custom condition fails
      if (retryConfig.retryCondition && !retryConfig.retryCondition(error)) {
        break;
      }

      // Don't retry on last attempt
      if (attempt === retryConfig.maxRetries) {
        break;
      }

      // Compute backoff respecting Retry-After if present
      const retryAfterHeader = error.response?.headers?.['retry-after'];
      let delayMs = 0;
      if (retryAfterHeader) {
        const seconds = Number(retryAfterHeader);
        delayMs = !Number.isNaN(seconds) ? seconds * 1000 : retryConfig.retryDelay;
      } else {
        const base = retryConfig.retryDelay * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * (retryConfig.retryDelay / 2));
        delayMs = base + jitter;
      }
      log.warn(
        `Retrying request in ${delayMs}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export async function testConnection(): Promise<boolean> {
  try {
    await makeJiraRequest({
      method: 'GET',
      url: '/myself',
    });
    return true;
  } catch (error) {
    log.error('Connection test failed:', error);
    return false;
  }
}

export function getMultipartClient(): AxiosInstance {
  if (jiraMultipartClient) {
    return jiraMultipartClient;
  }

  const auth = validateAuth();

  jiraMultipartClient = axios.create({
    baseURL: `${auth.baseUrl}${JIRA_CONFIG.BASE_PATH}`,
    timeout: JIRA_CONFIG.DEFAULT_TIMEOUT,
    headers: {
      Accept: 'application/json',
      'X-Atlassian-Token': 'no-check',
    },
    auth: {
      username: auth.email,
      password: auth.apiToken,
    },
  });

  // Add request interceptor for logging
  jiraMultipartClient.interceptors.request.use(
    (config) => {
      log.debug(
        `Multipart Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
      );
      return config;
    },
    (error) => {
      log.error('Multipart request error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  jiraMultipartClient.interceptors.response.use(
    (response) => {
      log.debug(`Multipart Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      log.error(`Jira API multipart error: ${error.response?.status} ${error.config?.url}`);

      if (error.response?.status === 401) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
      } else if (error.response?.status === 404) {
        throw new Error('Resource not found or insufficient permissions');
      } else if (error.response?.status === 429) {
        throw new Error(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
      } else if (!error.response) {
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
      }

      return Promise.reject(error);
    }
  );

  return jiraMultipartClient;
}

export async function makeMultipartRequest<T = any>(
  url: string,
  formData: FormData,
  retryConfig: RetryConfig = {
    maxRetries: JIRA_CONFIG.MAX_RETRIES,
    retryDelay: JIRA_CONFIG.RETRY_DELAY,
  }
): Promise<T> {
  const client = getMultipartClient();
  let lastError: any;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await client.post<T>(url, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
      return response.data;
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication or client errors
      if (
        error.response?.status === 401 ||
        error.response?.status === 403 ||
        error.response?.status === 404 ||
        (error.response?.status >= 400 &&
          error.response?.status < 500 &&
          error.response?.status !== 429)
      ) {
        break;
      }

      // Don't retry on last attempt
      if (attempt === retryConfig.maxRetries) {
        break;
      }

      // Compute backoff respecting Retry-After if present
      const retryAfterHeader = error.response?.headers?.['retry-after'];
      let delayMs = 0;
      if (retryAfterHeader) {
        const seconds = Number(retryAfterHeader);
        delayMs = !Number.isNaN(seconds) ? seconds * 1000 : retryConfig.retryDelay;
      } else {
        const base = retryConfig.retryDelay * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * (retryConfig.retryDelay / 2));
        delayMs = base + jitter;
      }
      log.warn(
        `Retrying multipart request in ${delayMs}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
