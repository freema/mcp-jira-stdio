import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import { JiraAuthConfig, RetryConfig } from '../types/common.js';
import { JIRA_CONFIG, ERROR_MESSAGES } from '../config/constants.js';
import { createLogger } from './logger.js';
import { getOAuthToken, OAuthConfig } from './oauth.js';

let jiraClient: AxiosInstance | null = null;
let jiraMultipartClient: AxiosInstance | null = null;
const log = createLogger('jira-auth');

export function validateAuth(): JiraAuthConfig {
  const authType = (process.env.JIRA_AUTH_TYPE || 'basic') as 'basic' | 'bearer' | 'oauth';
  const baseUrl = process.env.JIRA_BASE_URL;

  if (!baseUrl) {
    throw new Error(ERROR_MESSAGES.AUTH_REQUIRED);
  }

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  if (authType === 'oauth') {
    const clientId = process.env.JIRA_OAUTH_CLIENT_ID;
    const clientSecret = process.env.JIRA_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error(
        'JIRA_OAUTH_CLIENT_ID and JIRA_OAUTH_CLIENT_SECRET are required for OAuth authentication',
      );
    }
    return { baseUrl: normalizedBaseUrl, authType };
  }

  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!email || !apiToken) {
    throw new Error(ERROR_MESSAGES.AUTH_REQUIRED);
  }

  return { baseUrl: normalizedBaseUrl, email, apiToken, authType };
}

function addInterceptors(client: AxiosInstance, label: string): void {
  client.interceptors.request.use(
    (config) => {
      log.debug(`Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => {
      log.error(`${label} request error:`, error);
      return Promise.reject(error);
    },
  );

  client.interceptors.response.use(
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
    },
  );
}

export function getAuthenticatedClient(): AxiosInstance {
  if (jiraClient) {
    return jiraClient;
  }

  const authType = (process.env.JIRA_AUTH_TYPE || 'basic') as string;

  if (authType === 'oauth') {
    jiraClient = axios.create({
      timeout: JIRA_CONFIG.DEFAULT_TIMEOUT,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Async interceptor: injects OAuth token and correct base URL before each request
    jiraClient.interceptors.request.use(async (config) => {
      const oauthCfg: OAuthConfig = {
        clientId: process.env.JIRA_OAUTH_CLIENT_ID!,
        clientSecret: process.env.JIRA_OAUTH_CLIENT_SECRET!,
        siteUrl: process.env.JIRA_BASE_URL!,
      };
      const { token, cloudId } = await getOAuthToken(oauthCfg);
      config.baseURL = `https://api.atlassian.com/ex/jira/${cloudId}${JIRA_CONFIG.BASE_PATH}`;
      config.headers.Authorization = `Bearer ${token}`;
      log.debug(`Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    });
  } else {
    const auth = validateAuth();
    jiraClient = axios.create({
      baseURL: `${auth.baseUrl}${JIRA_CONFIG.BASE_PATH}`,
      timeout: JIRA_CONFIG.DEFAULT_TIMEOUT,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      auth: {
        username: auth.email!,
        password: auth.apiToken!,
      },
    });
    jiraClient.interceptors.request.use(
      (config) => {
        log.debug(`Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
      },
      (error) => {
        log.error('Request error:', error);
        return Promise.reject(error);
      },
    );
  }

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
    },
  );

  return jiraClient;
}

export async function makeJiraRequest<T = any>(
  config: AxiosRequestConfig,
  retryConfig: RetryConfig = {
    maxRetries: JIRA_CONFIG.MAX_RETRIES,
    retryDelay: JIRA_CONFIG.RETRY_DELAY,
  },
): Promise<T> {
  const client = getAuthenticatedClient();
  let lastError: any;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await client.request<T>(config);
      return response.data;
    } catch (error: any) {
      lastError = error;

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

      if (retryConfig.retryCondition && !retryConfig.retryCondition(error)) {
        break;
      }

      if (attempt === retryConfig.maxRetries) {
        break;
      }

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
      log.warn(`Retrying request in ${delayMs}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`);
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

  const authType = (process.env.JIRA_AUTH_TYPE || 'basic') as string;

  if (authType === 'oauth') {
    jiraMultipartClient = axios.create({
      timeout: JIRA_CONFIG.DEFAULT_TIMEOUT,
      headers: {
        Accept: 'application/json',
        'X-Atlassian-Token': 'no-check',
      },
    });

    jiraMultipartClient.interceptors.request.use(async (config) => {
      const oauthCfg: OAuthConfig = {
        clientId: process.env.JIRA_OAUTH_CLIENT_ID!,
        clientSecret: process.env.JIRA_OAUTH_CLIENT_SECRET!,
        siteUrl: process.env.JIRA_BASE_URL!,
      };
      const { token, cloudId } = await getOAuthToken(oauthCfg);
      config.baseURL = `https://api.atlassian.com/ex/jira/${cloudId}${JIRA_CONFIG.BASE_PATH}`;
      config.headers.Authorization = `Bearer ${token}`;
      log.debug(
        `Multipart Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      );
      return config;
    });
  } else {
    const auth = validateAuth();
    jiraMultipartClient = axios.create({
      baseURL: `${auth.baseUrl}${JIRA_CONFIG.BASE_PATH}`,
      timeout: JIRA_CONFIG.DEFAULT_TIMEOUT,
      headers: {
        Accept: 'application/json',
        'X-Atlassian-Token': 'no-check',
      },
      auth: {
        username: auth.email!,
        password: auth.apiToken!,
      },
    });
    jiraMultipartClient.interceptors.request.use(
      (config) => {
        log.debug(
          `Multipart Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        );
        return config;
      },
      (error) => {
        log.error('Multipart request error:', error);
        return Promise.reject(error);
      },
    );
  }

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
    },
  );

  return jiraMultipartClient;
}

export async function makeMultipartRequest<T = any>(
  url: string,
  formData: FormData,
  retryConfig: RetryConfig = {
    maxRetries: JIRA_CONFIG.MAX_RETRIES,
    retryDelay: JIRA_CONFIG.RETRY_DELAY,
  },
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

      if (attempt === retryConfig.maxRetries) {
        break;
      }

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
        `Retrying multipart request in ${delayMs}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
