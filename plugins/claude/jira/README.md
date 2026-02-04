# Jira Plugin for Claude Code

Jira integration for issue tracking, project management, and workflow automation.

## What's Included

- **MCP Server** - Connects Claude Code to Jira API
- **Skills** - Auto-triggers for issue management tasks
- **Agents** - `issue-manager` for focused Jira operations
- **Commands** - `/jira:search`, `/jira:create`, `/jira:my-issues`

## Installation

```bash
claude plugin install jira
```

**Required environment variables:**
```
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

## Commands

### /jira:search

Search issues using JQL:

```
/jira:search project = PROJ AND status = "In Progress"
/jira:search assignee = currentUser() ORDER BY updated DESC
```

### /jira:create

Create a new issue:

```
/jira:create PROJ Bug "Login button broken"
/jira:create PROJ Story "Add dark mode support"
```

### /jira:my-issues

List your assigned issues:

```
/jira:my-issues
```

## Agents

Spawn the issue manager for focused work:

```
spawn issue-manager to create a bug report for the checkout page crash
spawn issue-manager to update PROJ-123 with the latest findings
```

## Usage Examples

The plugin works automatically for Jira tasks:

- "Create a bug ticket for the login issue"
- "Find all open issues in project MYPROJ"
- "Update PROJ-123 priority to High"
- "Add a comment to PROJ-456"

## Links

- [Repository](https://github.com/freema/mcp-jira-stdio)
- [npm](https://www.npmjs.com/package/mcp-jira-stdio)
