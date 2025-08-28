import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { JiraAuthConfig, RetryConfig } from '../types/common.js';
import { JIRA_CONFIG, ERROR_MESSAGES } from '../config/constants.js';

let jiraClient: AxiosInstance | null = null;

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
      if (process.env.NODE_ENV === 'development') {
        console.error(`[DEV] Jira API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        // Log auth headers for debugging (but not the actual token)
        if (config.auth) {
          console.error(`[DEV] Auth: username=${config.auth.username}, password=***${config.auth.password?.slice(-4)}`);
        }
      }
      return config;
    },
    (error) => {
      console.error('Request error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  jiraClient.interceptors.response.use(
    (response) => {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[DEV] Jira API Response: ${response.status} ${response.config.url}`);
      }
      return response;
    },
    (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[DEV] Jira API error: ${error.response?.status} ${error.config?.url}`);
        if (error.response?.status === 401) {
          console.error('[DEV] Authentication failed - check your JIRA_EMAIL and JIRA_API_TOKEN');
          console.error(`[DEV] Using email: ${error.config?.auth?.username}`);
          console.error(`[DEV] Full URL: ${error.config?.baseURL}${error.config?.url}`);
        }
      } else {
        console.error(`Jira API error: ${error.response?.status} ${error.config?.url}`);
      }

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

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, retryConfig.retryDelay * (attempt + 1)));
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
    console.error('Connection test failed:', error);
    return false;
  }
}
