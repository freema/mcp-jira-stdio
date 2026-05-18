# MCP Jira Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/mcp-jira-stdio.svg)](https://www.npmjs.com/package/mcp-jira-stdio)
[![MCP Server](https://img.shields.io/badge/MCP-Server-blue)](https://glama.ai/mcp/servers)

[![CI](https://github.com/freema/mcp-jira-stdio/actions/workflows/ci.yml/badge.svg)](https://github.com/freema/mcp-jira-stdio/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/freema/mcp-jira-stdio/branch/main/graph/badge.svg)](https://codecov.io/gh/freema/mcp-jira-stdio)
[![GitHub issues](https://img.shields.io/github/issues/freema/mcp-jira-stdio)](https://github.com/freema/mcp-jira-stdio/issues)

<a href="https://glama.ai/mcp/servers/@freema/mcp-jira-stdio">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@freema/mcp-jira-stdio/badge" />
</a>

A Model Context Protocol (MCP) server for Jira API integration. Enables reading, writing, and managing Jira issues and projects directly from your MCP client (e.g., Claude Desktop).

## ⚡ Quick Install for Claude Code

The fastest way to add this MCP server to Claude Code:

**Basic auth (API token):**

```bash
claude mcp add jira npx mcp-jira-stdio@latest \
  --env JIRA_BASE_URL=https://yourcompany.atlassian.net \
  --env JIRA_EMAIL=your-email@example.com \
  --env JIRA_API_TOKEN=your-api-token
```

**OAuth 2.0** (for organizations that have disabled API token access):

```bash
claude mcp add jira npx mcp-jira-stdio@latest \
  --env JIRA_BASE_URL=https://yourcompany.atlassian.net \
  --env JIRA_AUTH_TYPE=oauth \
  --env JIRA_OAUTH_CLIENT_ID=your-client-id \
  --env JIRA_OAUTH_CLIENT_SECRET=your-client-secret
```

Replace the values with your actual Jira credentials:
- **JIRA_BASE_URL**: Your Jira instance URL (e.g., `https://yourcompany.atlassian.net`)
- **JIRA_EMAIL**: Your Jira account email *(basic auth only)*
- **JIRA_API_TOKEN**: Your Jira API token ([generate here](https://id.atlassian.com/manage-profile/security/api-tokens)) *(basic auth only)*
- **JIRA_OAUTH_CLIENT_ID / JIRA_OAUTH_CLIENT_SECRET**: OAuth 2.0 app credentials ([see OAuth setup](#oauth-20-setup)) *(OAuth only)*

That's it! The server will be automatically configured and ready to use.

### Alternative: Manual Configuration

If you prefer to configure manually or use Claude Desktop, see the [Configuration](#6-configure-mcp-client) section below.

## 🚀 Quick Start

### 1. Prerequisites

- Node.js v18 or higher
- Jira instance (Cloud or Server)
- Jira API token

### 2. Installation

```bash
# Install from npm
npm install -g mcp-jira-stdio

# Or install locally in your project
npm install mcp-jira-stdio
```

#### Development Installation

```bash
# Clone the repository
git clone https://github.com/freema/mcp-jira-stdio.git
cd mcp-jira-stdio

# Install dependencies
npm install
# or using Task runner
task install

# Build the project
npm run build
# or
task build
```

### 3. Jira API Setup

Two authentication methods are supported:

#### Basic Auth (API Token) — default

1. Go to [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens) and create a token
2. Note your Jira base URL (e.g., `https://yourcompany.atlassian.net`)

#### OAuth 2.0 — for organizations that have disabled API token access

See the [OAuth 2.0 Setup](#oauth-20-setup) section below.

### 4. Configuration

Create a `.env` file from the provided example:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual Jira credentials
# Or use Task runner:
task env
```

**Basic auth** `.env`:

```env
JIRA_BASE_URL=https://your-instance.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

**OAuth 2.0** `.env`:

```env
JIRA_BASE_URL=https://your-instance.atlassian.net
JIRA_AUTH_TYPE=oauth
JIRA_OAUTH_CLIENT_ID=your-client-id
JIRA_OAUTH_CLIENT_SECRET=your-client-secret
```

### 5. Test Connection

```bash
# Test Jira connection
task jira:test

# List visible projects
task jira:projects
```

### 6. Configure MCP Client

#### For Claude Code

Use the quick install command (recommended):

**Basic auth:**

```bash
claude mcp add jira npx mcp-jira-stdio@latest \
  --env JIRA_BASE_URL=https://yourcompany.atlassian.net \
  --env JIRA_EMAIL=your-email@example.com \
  --env JIRA_API_TOKEN=your-api-token
```

**OAuth 2.0:**

```bash
claude mcp add jira npx mcp-jira-stdio@latest \
  --env JIRA_BASE_URL=https://yourcompany.atlassian.net \
  --env JIRA_AUTH_TYPE=oauth \
  --env JIRA_OAUTH_CLIENT_ID=your-client-id \
  --env JIRA_OAUTH_CLIENT_SECRET=your-client-secret
```

#### For Claude Desktop

Add to your Claude Desktop config:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

**Basic auth:**

```json
{
  "mcpServers": {
    "jira": {
      "command": "mcp-jira-stdio",
      "env": {
        "JIRA_BASE_URL": "https://your-instance.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**OAuth 2.0:**

```json
{
  "mcpServers": {
    "jira": {
      "command": "mcp-jira-stdio",
      "env": {
        "JIRA_BASE_URL": "https://your-instance.atlassian.net",
        "JIRA_AUTH_TYPE": "oauth",
        "JIRA_OAUTH_CLIENT_ID": "your-client-id",
        "JIRA_OAUTH_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

#### Alternative: Using npx

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["mcp-jira-stdio"],
      "env": {
        "JIRA_BASE_URL": "https://your-instance.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

Restart Claude Desktop after adding the configuration.

## 📦 Available Tools

### Projects

- `jira_get_visible_projects`: Retrieves all projects visible to the user.
- `jira_get_project_info`: Retrieves detailed information about a project (components, versions, roles, insights).

### Issues

- `jira_get_issue`: Retrieve issue details by key (supports optional fields/expand).
- `jira_search_issues`: Search for Jira issues using JQL with pagination and fields.
- `jira_create_issue`: Create a new issue in a project (type, priority, assignee, labels, components).
- `jira_update_issue`: Update an existing issue (summary, description, priority, assignee, labels, components).
- `jira_create_subtask`: Create a subtask under a parent issue (auto-detects subtask type).

### Comments

- `jira_add_comment`: Add a comment to an issue (optional visibility by group/role).

### Metadata & Users

- `jira_get_create_meta`: Get create metadata for a project showing all available fields (including custom fields) with their allowed values. Essential for discovering required fields before creating issues.
- `jira_get_issue_types`: List issue types (optionally per project).
- `jira_get_users`: Search for users (by query, username, or accountId).
- `jira_get_priorities`: List available priorities.
- `jira_get_statuses`: List available statuses (global or project-specific).
- `jira_get_custom_fields`: List all custom fields in Jira with their types and schemas.

### My Work

- `jira_get_my_issues`: Retrieve issues assigned to the current user (sorted by updated).

## 🛠️ Development

### Development Commands

```bash
# Development mode with hot reload
npm run dev
task dev

# Build for production
npm run build
task build

# Type checking
npm run typecheck
task typecheck

# Linting
npm run lint
task lint

# Format code
npm run format
task fmt

# Run all checks
npm run check
task check
```

### MCP Inspector

Debug your MCP server using the inspector:

```bash
# Run inspector (production build)
npm run inspector
task inspector

# Run inspector (development mode)
npm run inspector:dev
task inspector:dev
```

Notes:

- Startup no longer blocks on Jira connectivity. If required env vars are missing the server still starts and lists tools; tool calls will fail with a clear auth error.
- Connection testing runs only in development/test (`NODE_ENV=development` or `test`). Failures are logged but do not terminate the server, so the inspector can still display tools.
- When using OAuth, the browser authorization prompt fires on the **first tool call**, not at startup.

### Testing

```bash
# Run tests
npm test
task test

# Run tests with coverage
npm run test:coverage
task test:coverage

# Watch mode
npm run test:watch
task test:watch
```

## 📋 Project Structure

```
src/
├── index.ts              # Entry point & MCP server setup
├── config/
│   └── constants.ts      # API configuration & constants
├── tools/
│   ├── index.ts          # Tool exports
│   └── get-visible-projects.ts  # Get visible projects tool
├── types/
│   ├── common.ts         # Common types & interfaces
│   ├── jira.ts           # Jira API types
│   └── tools.ts          # Tool input/output schemas
└── utils/
    ├── jira-auth.ts      # Jira authentication & client
    ├── validators.ts     # Input validation with Zod
    ├── formatters.ts     # Response formatting
    ├── error-handler.ts  # Error handling
    └── api-helpers.ts    # Jira API helpers
```

## 🔧 Tool Usage Examples

### Get Visible Projects

```javascript
// List all projects
jira_get_visible_projects({});

// List projects with additional details
jira_get_visible_projects({
  expand: ['description', 'lead', 'issueTypes'],
});

// List recent projects only
jira_get_visible_projects({
  recent: 10,
});
```

## ❗ Troubleshooting

### Common Issues

**"Authentication failed"**

- Verify your API token is correct
- Check that your email matches your Jira account
- Ensure your Jira base URL is correct (no trailing slash)

**"Connection failed"**

- Verify your Jira instance is accessible
- Check network connectivity
- Ensure Jira REST API is enabled

**"Permission denied"**

- Verify your account has the necessary permissions
- Check project permissions in Jira
- Ensure you're using the correct Jira instance

**OAuth: "Port 7789 is already in use"**

- Another process is using the callback port. Stop it and retry, or kill it with `lsof -ti:7789 | xargs kill`.

**OAuth: "Jira site not found in accessible resources"**

- The `JIRA_BASE_URL` must match exactly one of the sites returned by Atlassian (e.g., `https://yourcompany.atlassian.net`).
- Delete `~/.mcp-jira-stdio/tokens.json` to force a fresh authorization if credentials changed.

**OAuth: browser does not open automatically**

- The server prints the authorization URL to stderr — copy and open it manually.

**MCP Connection Issues**

- Ensure you're using the built version (`dist/index.js`)
- Check that Node.js path is correct in Claude Desktop config
- Look for errors in Claude Desktop logs
- Use `task inspector` to debug

**Timeout when running multiple instances with npx**

If you're running multiple Claude Code sessions simultaneously and experience timeouts, this is caused by `npx` cache/registry locking — not the MCP server itself. Each instance tries to verify the package, causing conflicts. To fix this, install the package globally instead:

```bash
npm install -g mcp-jira-stdio
claude mcp add jira mcp-jira-stdio \
  --env JIRA_BASE_URL=... \
  --env JIRA_EMAIL=... \
  --env JIRA_API_TOKEN=...
```

### Debug Commands

```bash
# Test Jira connection
task jira:test

# List projects (test API connectivity)
task jira:projects

# Run MCP inspector for debugging
task inspector:dev

# Check all configuration
task check
```

If the inspector shows an SSE error and the server exits immediately, ensure you are not forcing an early exit with invalid credentials. With the current behavior, the server should not exit on missing credentials; export your Jira vars to exercise the tools:

```bash
export JIRA_BASE_URL="https://your-instance.atlassian.net"
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-api-token"
npm run inspector
```

## 🔍 Environment Variables

| Variable                    | Required              | Description                           | Example                         |
| --------------------------- | --------------------- | ------------------------------------- | ------------------------------- |
| `JIRA_BASE_URL`             | Yes                   | Jira instance URL                     | `https://company.atlassian.net` |
| `JIRA_AUTH_TYPE`            | No                    | Auth method: `basic` (default) or `oauth` | `oauth`                     |
| `JIRA_EMAIL`                | Yes *(basic auth)*    | Your Jira account email               | `user@example.com`              |
| `JIRA_API_TOKEN`            | Yes *(basic auth)*    | Jira API token                        | `ATxxx...`                      |
| `JIRA_OAUTH_CLIENT_ID`      | Yes *(OAuth)*         | OAuth 2.0 app client ID               | `abc123`                        |
| `JIRA_OAUTH_CLIENT_SECRET`  | Yes *(OAuth)*         | OAuth 2.0 app client secret           | `secret...`                     |
| `NODE_ENV`                  | No                    | Environment mode                      | `development` or `production`   |

## 🔑 OAuth 2.0 Setup

Use OAuth 2.0 when your Atlassian organization has disabled personal API token access.

### 1. Create an OAuth 2.0 app

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) and click **Create**.
2. Choose **OAuth 2.0 integration**.
3. Under **Permissions**, add the **Jira API** and enable these scopes:
   - `read:jira-user`
   - `read:jira-work`
   - `write:jira-work`
   - `offline_access` (required for token refresh)
4. Under **Authorization**, add the callback URL: `http://localhost:7789/callback`
5. Copy the **Client ID** and **Client Secret**.

### 2. Configure the server

Set these environment variables (alongside `JIRA_BASE_URL`):

```env
JIRA_AUTH_TYPE=oauth
JIRA_OAUTH_CLIENT_ID=your-client-id
JIRA_OAUTH_CLIENT_SECRET=your-client-secret
```

### 3. First-run authorization

On the first tool call, the server will:

1. Open your browser to the Atlassian authorization page.
2. Ask you to grant access to the app.
3. Store the tokens in `~/.mcp-jira-stdio/tokens.json` (mode `600`).

Subsequent calls use stored tokens and refresh them automatically — no browser interaction needed until the refresh token expires.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and linting (`task check`)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

### MCP Config Setup

Configure Claude Desktop to use this MCP server interactively:

```bash
npm run setup:mcp
```

The script will:

- Build the project if needed and detect your Node path
- Prompt for `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
- Save a `jira` entry into your Claude Desktop config or print the JSON
- Optionally generate a local `.env` for development
