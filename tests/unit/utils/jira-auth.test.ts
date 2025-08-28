import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import {
  validateAuth,
  getAuthenticatedClient,
  makeJiraRequest,
  testConnection,
} from '../../../src/utils/jira-auth.js';
import { ERROR_MESSAGES } from '../../../src/config/constants.js';
import {
  mockUnauthorizedError,
  mockNotFoundError,
  mockRateLimitError,
  mockNetworkError,
  mockServerError,
} from '../../mocks/jira-responses.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('jira-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
  });

  afterEach(() => {
    // Clear any cached client
    vi.resetModules();
  });

  describe('validateAuth', () => {
    it('should return valid auth config when all env vars are set', () => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net/';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      const result = validateAuth();
      expect(result).toEqual({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });
    });

    it('should normalize base URL by removing trailing slash', () => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net/';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      const result = validateAuth();
      expect(result.baseUrl).toBe('https://test.atlassian.net');
    });

    it('should keep base URL without trailing slash unchanged', () => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      const result = validateAuth();
      expect(result.baseUrl).toBe('https://test.atlassian.net');
    });

    it('should throw error when JIRA_BASE_URL is missing', () => {
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      expect(() => validateAuth()).toThrow(ERROR_MESSAGES.AUTH_REQUIRED);
    });

    it('should throw error when JIRA_EMAIL is missing', () => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_API_TOKEN = 'test-token';

      expect(() => validateAuth()).toThrow(ERROR_MESSAGES.AUTH_REQUIRED);
    });

    it('should throw error when JIRA_API_TOKEN is missing', () => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';

      expect(() => validateAuth()).toThrow(ERROR_MESSAGES.AUTH_REQUIRED);
    });

    it('should throw error when all env vars are missing', () => {
      expect(() => validateAuth()).toThrow(ERROR_MESSAGES.AUTH_REQUIRED);
    });
  });

  describe('getAuthenticatedClient', () => {
    beforeEach(() => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';
    });

    it('should create axios client with correct configuration', () => {
      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client = getAuthenticatedClient();

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test.atlassian.net/rest/api/3',
        timeout: 30000,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        auth: {
          username: 'test@example.com',
          password: 'test-token',
        },
      });
      expect(client).toBe(mockAxiosInstance);
    });

    it('should return cached client on subsequent calls', () => {
      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      const client1 = getAuthenticatedClient();
      const client2 = getAuthenticatedClient();

      expect(mockedAxios.create).toHaveBeenCalledTimes(1);
      expect(client1).toBe(client2);
    });

    it('should setup request interceptor', () => {
      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      getAuthenticatedClient();

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should setup response interceptor', () => {
      const mockAxiosInstance = {
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

      getAuthenticatedClient();

      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('makeJiraRequest', () => {
    let mockClient: any;

    beforeEach(() => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      mockClient = {
        request: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      mockedAxios.create.mockReturnValue(mockClient);
    });

    it('should make successful request and return data', async () => {
      const mockResponse = { data: { key: 'TEST-123' } };
      mockClient.request.mockResolvedValue(mockResponse);

      const config = { method: 'GET', url: '/issue/TEST-123' };
      const result = await makeJiraRequest(config);

      expect(mockClient.request).toHaveBeenCalledWith(config);
      expect(result).toEqual(mockResponse.data);
    });

    it('should retry on server errors', async () => {
      const serverError = { response: { status: 500 } };
      const mockResponse = { data: { key: 'TEST-123' } };
      
      mockClient.request
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue(mockResponse);

      const config = { method: 'GET', url: '/issue/TEST-123' };
      const result = await makeJiraRequest(config, { maxRetries: 1, retryDelay: 10 });

      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse.data);
    });

    it('should not retry on authentication errors', async () => {
      mockClient.request.mockRejectedValue(mockUnauthorizedError);

      const config = { method: 'GET', url: '/issue/TEST-123' };
      
      await expect(makeJiraRequest(config)).rejects.toEqual(mockUnauthorizedError);
      expect(mockClient.request).toHaveBeenCalledTimes(1);
    });

    it('should not retry on forbidden errors', async () => {
      const forbiddenError = { response: { status: 403 } };
      mockClient.request.mockRejectedValue(forbiddenError);

      const config = { method: 'GET', url: '/issue/TEST-123' };
      
      await expect(makeJiraRequest(config)).rejects.toEqual(forbiddenError);
      expect(mockClient.request).toHaveBeenCalledTimes(1);
    });

    it('should not retry on not found errors', async () => {
      mockClient.request.mockRejectedValue(mockNotFoundError);

      const config = { method: 'GET', url: '/issue/TEST-123' };
      
      await expect(makeJiraRequest(config)).rejects.toEqual(mockNotFoundError);
      expect(mockClient.request).toHaveBeenCalledTimes(1);
    });

    it('should retry on rate limit errors', async () => {
      const mockResponse = { data: { key: 'TEST-123' } };
      
      mockClient.request
        .mockRejectedValueOnce(mockRateLimitError)
        .mockResolvedValue(mockResponse);

      const config = { method: 'GET', url: '/issue/TEST-123' };
      const result = await makeJiraRequest(config, { maxRetries: 1, retryDelay: 10 });

      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse.data);
    });

    it('should respect custom retry condition', async () => {
      const customError = { response: { status: 500 } };
      mockClient.request.mockRejectedValue(customError);

      const retryCondition = vi.fn(() => false);
      const config = { method: 'GET', url: '/issue/TEST-123' };
      
      await expect(makeJiraRequest(config, { maxRetries: 3, retryDelay: 10, retryCondition }))
        .rejects.toEqual(customError);
      
      expect(mockClient.request).toHaveBeenCalledTimes(1);
      expect(retryCondition).toHaveBeenCalledWith(customError);
    });

    it('should exhaust all retries before throwing error', async () => {
      const serverError = { response: { status: 500 } };
      mockClient.request.mockRejectedValue(serverError);

      const config = { method: 'GET', url: '/issue/TEST-123' };
      
      await expect(makeJiraRequest(config, { maxRetries: 2, retryDelay: 10 }))
        .rejects.toEqual(serverError);
      
      expect(mockClient.request).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should handle network errors', async () => {
      mockClient.request.mockRejectedValue(mockNetworkError);

      const config = { method: 'GET', url: '/issue/TEST-123' };
      
      await expect(makeJiraRequest(config, { maxRetries: 1, retryDelay: 10 }))
        .rejects.toEqual(mockNetworkError);
      
      expect(mockClient.request).toHaveBeenCalledTimes(2); // should retry network errors
    });
  });

  describe('testConnection', () => {
    let mockClient: any;

    beforeEach(() => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      mockClient = {
        request: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      mockedAxios.create.mockReturnValue(mockClient);
    });

    it('should return true on successful connection', async () => {
      mockClient.request.mockResolvedValue({ data: { accountId: 'test-id' } });

      const result = await testConnection();

      expect(result).toBe(true);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/myself',
      });
    });

    it('should return false on connection failure', async () => {
      mockClient.request.mockRejectedValue(mockUnauthorizedError);

      const result = await testConnection();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockClient.request.mockRejectedValue(mockNetworkError);

      const result = await testConnection();

      expect(result).toBe(false);
    });
  });
});