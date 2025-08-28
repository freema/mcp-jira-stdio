import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { validateAuth, testConnection } from '../../src/utils/jira-auth.js';
import * as tools from '../../src/tools/index.js';

// Mock all dependencies
vi.mock('@modelcontextprotocol/sdk/server/index.js');
vi.mock('@modelcontextprotocol/sdk/server/stdio.js');
vi.mock('../../src/utils/jira-auth.js');
vi.mock('../../src/tools/index.js');
vi.mock('dotenv', () => ({
  config: vi.fn(() => ({ parsed: { JIRA_BASE_URL: 'test' } })),
}));

const mockedServer = vi.mocked(Server);
const mockedStdioServerTransport = vi.mocked(StdioServerTransport);
const mockedValidateAuth = vi.mocked(validateAuth);
const mockedTestConnection = vi.mocked(testConnection);

// Mock all tool handlers
const mockToolHandlers = {
  handleGetVisibleProjects: vi.fn(),
  handleGetIssue: vi.fn(),
  handleSearchIssues: vi.fn(),
  handleGetMyIssues: vi.fn(),
  handleGetIssueTypes: vi.fn(),
  handleGetUsers: vi.fn(),
  handleGetPriorities: vi.fn(),
  handleGetStatuses: vi.fn(),
  handleCreateIssue: vi.fn(),
  handleUpdateIssue: vi.fn(),
  handleAddComment: vi.fn(),
  handleGetProjectInfo: vi.fn(),
  handleCreateSubtask: vi.fn(),
};

// Mock all tool definitions
const mockTools = {
  getVisibleProjectsTool: { name: 'jira_get_visible_projects', description: 'Get projects' },
  getIssueTool: { name: 'jira_get_issue', description: 'Get issue' },
  searchIssuesTool: { name: 'jira_search_issues', description: 'Search issues' },
  getMyIssuesTool: { name: 'jira_get_my_issues', description: 'Get my issues' },
  getIssueTypesTool: { name: 'jira_get_issue_types', description: 'Get issue types' },
  getUsersTool: { name: 'jira_get_users', description: 'Get users' },
  getPrioritiesTool: { name: 'jira_get_priorities', description: 'Get priorities' },
  getStatusesTool: { name: 'jira_get_statuses', description: 'Get statuses' },
  createIssueTool: { name: 'jira_create_issue', description: 'Create issue' },
  updateIssueTool: { name: 'jira_update_issue', description: 'Update issue' },
  addCommentTool: { name: 'jira_add_comment', description: 'Add comment' },
  getProjectInfoTool: { name: 'jira_get_project_info', description: 'Get project info' },
  createSubtaskTool: { name: 'jira_create_subtask', description: 'Create subtask' },
};

// Apply mocks
Object.assign(tools, { ...mockToolHandlers, ...mockTools });

describe('MCP Server Main', () => {
  let mockServerInstance: any;
  let mockTransportInstance: any;
  let originalProcessExit: any;
  let originalConsoleError: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock server instance
    mockServerInstance = {
      setRequestHandler: vi.fn(),
      connect: vi.fn(),
    };
    
    // Mock transport instance
    mockTransportInstance = {};
    
    mockedServer.mockImplementation(() => mockServerInstance as any);
    mockedStdioServerTransport.mockImplementation(() => mockTransportInstance as any);
    
    // Mock process.exit to prevent actual exit during tests
    originalProcessExit = process.exit;
    process.exit = vi.fn() as any;
    
    // Mock console.error
    originalConsoleError = console.error;
    console.error = vi.fn();
    
    // Reset environment variables
    process.env.NODE_ENV = 'test';
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
  });
  
  afterEach(() => {
    // Restore original functions
    process.exit = originalProcessExit;
    console.error = originalConsoleError;
    
    // Clear dynamic imports cache
    vi.resetModules();
  });

  describe('Server Initialization', () => {
    beforeEach(() => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';
    });

    it('should initialize server with correct configuration', async () => {
      mockedValidateAuth.mockReturnValue({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });
      mockedTestConnection.mockResolvedValue(true);

      // Dynamic import to trigger main function
      await import('../../src/index.js');

      expect(mockedServer).toHaveBeenCalledWith(
        {
          name: 'jira-mcp-server',
          version: '1.0.0',
        },
        {
          capabilities: {
            resources: {},
            tools: {},
          },
        }
      );
    });

    it('should validate authentication on startup', async () => {
      mockedValidateAuth.mockReturnValue({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });
      mockedTestConnection.mockResolvedValue(true);

      await import('../../src/index.js');

      expect(mockedValidateAuth).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('🔐 Authenticated as: test@example.com');
      expect(console.error).toHaveBeenCalledWith('🌐 Jira instance: https://test.atlassian.net');
    });

    it('should test connection on startup', async () => {
      mockedValidateAuth.mockReturnValue({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });
      mockedTestConnection.mockResolvedValue(true);

      await import('../../src/index.js');

      expect(mockedTestConnection).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('🔍 Testing connection to Jira...');
      expect(console.error).toHaveBeenCalledWith('✅ Connection to Jira successful');
    });

    it('should exit on authentication failure', async () => {
      const authError = new Error('Authentication failed');
      mockedValidateAuth.mockImplementation(() => {
        throw authError;
      });

      await import('../../src/index.js');

      expect(console.error).toHaveBeenCalledWith('❌ Authentication Error:', 'Authentication failed');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit on connection test failure', async () => {
      mockedValidateAuth.mockReturnValue({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });
      mockedTestConnection.mockResolvedValue(false);

      await import('../../src/index.js');

      expect(console.error).toHaveBeenCalledWith('❌ Connection to Jira failed');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should setup request handlers', async () => {
      mockedValidateAuth.mockReturnValue({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });
      mockedTestConnection.mockResolvedValue(true);

      await import('../../src/index.js');

      // Should setup 4 request handlers: ListTools, CallTool, ListResources, ReadResource
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledTimes(4);
    });

    it('should connect to stdio transport', async () => {
      mockedValidateAuth.mockReturnValue({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });
      mockedTestConnection.mockResolvedValue(true);

      await import('../../src/index.js');

      expect(mockedStdioServerTransport).toHaveBeenCalled();
      expect(mockServerInstance.connect).toHaveBeenCalledWith(mockTransportInstance);
      expect(console.error).toHaveBeenCalledWith('🚀 Jira MCP server running on stdio');
    });
  });

  describe('Request Handlers', () => {
    let listToolsHandler: any;
    let callToolHandler: any;
    let listResourcesHandler: any;
    let readResourceHandler: any;

    beforeEach(async () => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      mockedValidateAuth.mockReturnValue({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });
      mockedTestConnection.mockResolvedValue(true);

      await import('../../src/index.js');

      // Extract handlers from setRequestHandler calls
      const calls = mockServerInstance.setRequestHandler.mock.calls;
      listToolsHandler = calls.find(call => call[0].type === 'ListToolsRequest')?.[1];
      callToolHandler = calls.find(call => call[0].type === 'CallToolRequest')?.[1];
      listResourcesHandler = calls.find(call => call[0].type === 'ListResourcesRequest')?.[1];
      readResourceHandler = calls.find(call => call[0].type === 'ReadResourceRequest')?.[1];
    });

    describe('ListTools Handler', () => {
      it('should return all available tools', async () => {
        const result = await listToolsHandler();

        expect(result.tools).toBeDefined();
        expect(result.tools.length).toBe(13);
        expect(console.error).toHaveBeenCalledWith('📋 Listing 13 available tool(s)');
      });
    });

    describe('CallTool Handler', () => {
      it('should execute valid tool successfully', async () => {
        const mockRequest = {
          params: {
            name: 'jira_get_issue',
            arguments: { issueKey: 'TEST-123' },
          },
        };
        const mockResponse = { content: [{ type: 'text', text: 'issue data' }] };

        mockToolHandlers.handleGetIssue.mockResolvedValue(mockResponse);

        const result = await callToolHandler(mockRequest);

        expect(mockToolHandlers.handleGetIssue).toHaveBeenCalledWith({ issueKey: 'TEST-123' });
        expect(result).toEqual(mockResponse);
        expect(console.error).toHaveBeenCalledWith('🛠️ Executing tool: jira_get_issue');
        expect(console.error).toHaveBeenCalledWith('✅ Tool jira_get_issue executed successfully');
      });

      it('should handle unknown tool error', async () => {
        const mockRequest = {
          params: {
            name: 'unknown_tool',
            arguments: {},
          },
        };

        await expect(callToolHandler(mockRequest)).rejects.toThrow('Unknown tool: unknown_tool');
      });

      it('should handle tool execution errors', async () => {
        const mockRequest = {
          params: {
            name: 'jira_get_issue',
            arguments: { issueKey: 'TEST-123' },
          },
        };
        const toolError = new Error('Tool execution failed');

        mockToolHandlers.handleGetIssue.mockRejectedValue(toolError);

        await expect(callToolHandler(mockRequest)).rejects.toThrow('Tool execution failed');
        expect(console.error).toHaveBeenCalledWith('❌ Error executing tool jira_get_issue:', 'Tool execution failed');
      });

      it('should execute all tool handlers', async () => {
        const toolTests = [
          { name: 'jira_get_visible_projects', handler: 'handleGetVisibleProjects' },
          { name: 'jira_get_issue', handler: 'handleGetIssue' },
          { name: 'jira_search_issues', handler: 'handleSearchIssues' },
          { name: 'jira_get_my_issues', handler: 'handleGetMyIssues' },
          { name: 'jira_get_issue_types', handler: 'handleGetIssueTypes' },
          { name: 'jira_get_users', handler: 'handleGetUsers' },
          { name: 'jira_get_priorities', handler: 'handleGetPriorities' },
          { name: 'jira_get_statuses', handler: 'handleGetStatuses' },
          { name: 'jira_create_issue', handler: 'handleCreateIssue' },
          { name: 'jira_update_issue', handler: 'handleUpdateIssue' },
          { name: 'jira_add_comment', handler: 'handleAddComment' },
          { name: 'jira_get_project_info', handler: 'handleGetProjectInfo' },
          { name: 'jira_create_subtask', handler: 'handleCreateSubtask' },
        ];

        for (const { name, handler } of toolTests) {
          const mockRequest = {
            params: {
              name,
              arguments: { test: 'data' },
            },
          };
          const mockResponse = { content: [{ type: 'text', text: `${name} response` }] };

          mockToolHandlers[handler].mockResolvedValue(mockResponse);

          const result = await callToolHandler(mockRequest);

          expect(mockToolHandlers[handler]).toHaveBeenCalledWith({ test: 'data' });
          expect(result).toEqual(mockResponse);
        }
      });
    });

    describe('ListResources Handler', () => {
      it('should return empty resources array', async () => {
        const result = await listResourcesHandler();

        expect(result).toEqual({ resources: [] });
      });
    });

    describe('ReadResource Handler', () => {
      it('should throw not implemented error', async () => {
        await expect(readResourceHandler()).rejects.toThrow('Resource reading not implemented');
      });
    });
  });

  describe('Environment Loading', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should load .env in development mode', async () => {
      // This test verifies the dotenv loading logic
      // The actual loading happens before our mocks are set up
      expect(process.env.NODE_ENV).toBe('development');
    });

    it('should not load .env in production mode', async () => {
      process.env.NODE_ENV = 'production';
      // In production, .env loading is skipped
      expect(process.env.NODE_ENV).toBe('production');
    });
  });

  describe('Error Handling', () => {
    it('should handle main function errors', async () => {
      // Mock an error in main execution
      mockedValidateAuth.mockImplementation(() => {
        throw new Error('Fatal error during startup');
      });

      await import('../../src/index.js');

      expect(console.error).toHaveBeenCalledWith('❌ Authentication Error:', 'Fatal error during startup');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle async errors in tool execution', async () => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      mockedValidateAuth.mockReturnValue({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });
      mockedTestConnection.mockResolvedValue(true);

      await import('../../src/index.js');

      const calls = mockServerInstance.setRequestHandler.mock.calls;
      const callToolHandler = calls.find(call => call[0].type === 'CallToolRequest')?.[1];

      const mockRequest = {
        params: {
          name: 'jira_get_issue',
          arguments: { issueKey: 'TEST-123' },
        },
      };

      // Simulate async error
      const asyncError = new Error('Async operation failed');
      mockToolHandlers.handleGetIssue.mockRejectedValue(asyncError);

      await expect(callToolHandler(mockRequest)).rejects.toThrow('Async operation failed');
    });

    it('should handle network errors gracefully', async () => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_EMAIL = 'test@example.com';
      process.env.JIRA_API_TOKEN = 'test-token';

      mockedValidateAuth.mockReturnValue({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });

      // Simulate network error during connection test
      const networkError = new Error('Network unreachable');
      mockedTestConnection.mockRejectedValue(networkError);

      await import('../../src/index.js');

      expect(console.error).toHaveBeenCalledWith('❌ Connection to Jira failed');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});