# MCP Jira Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for Jira API integration. Enables reading, writing, and managing Jira issues and projects directly from your MCP client (e.g., Claude Desktop).

## 🚀 Quick Start

### 1. Prerequisites

- Node.js v18 or higher
- Jira instance (Cloud or Server)
- Jira API token

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/graslt/mcp-jira-stdio.git
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

1. Go to your Jira instance settings
2. Create an API token:
   - **Jira Cloud**: Go to Account Settings → Security → Create and manage API tokens
   - **Jira Server**: Use your username and password (or create an application password)
3. Note your Jira base URL (e.g., `https://yourcompany.atlassian.net`)

### 4. Configuration

Create a `.env` file from the provided example:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual Jira credentials
# Or use Task runner:
task env
```

Example `.env` contents:

```env
JIRA_BASE_URL=https://your-instance.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

**Note:** Generate your API token at [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

### 5. Test Connection

```bash
# Test Jira connection
task jira:test

# List visible projects
task jira:projects
```

### 6. Configure MCP Client

Add to your Claude Desktop config:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-jira-stdio/dist/index.js"],
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

### Project Management
- `jira_get_visible_projects` - List all accessible projects

### Issue Management (Coming Soon)
- `jira_get_issue` - Get issue details by key
- `jira_create_issue` - Create new issues
- `jira_update_issue` - Update existing issues
- `jira_search_issues` - Search issues with JQL

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
jira_get_visible_projects({})

// List projects with additional details
jira_get_visible_projects({
  "expand": ["description", "lead", "issueTypes"]
})

// List recent projects only
jira_get_visible_projects({
  "recent": 10
})
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

**MCP Connection Issues**
- Ensure you're using the built version (`dist/index.js`)
- Check that Node.js path is correct in Claude Desktop config
- Look for errors in Claude Desktop logs
- Use `task inspector` to debug

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

## 🔍 Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JIRA_BASE_URL` | Yes | Jira instance URL | `https://company.atlassian.net` |
| `JIRA_EMAIL` | Yes | Your Jira email | `user@example.com` |
| `JIRA_API_TOKEN` | Yes | Jira API token | `ATxxx...` |
| `NODE_ENV` | No | Environment mode | `development` or `production` |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and linting (`task check`)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [x] Project listing
- [ ] Issue management (get, create, update)
- [ ] Issue searching with JQL
- [ ] Comment management
- [ ] Attachment handling
- [ ] Transition management
- [ ] Sprint and board integration
- [ ] User and group management
