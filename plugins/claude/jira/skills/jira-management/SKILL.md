---
name: jira-management
description: This skill should be used when the user asks about Jira issues, tickets, projects, sprints, or bug tracking. Activates for creating, updating, searching, or commenting on Jira issues.
---

When the user asks about Jira or issue tracking, use the Jira MCP tools.

## When to Use This Skill

Activate when the user:

- Wants to create issues ("Create a bug ticket", "File a story")
- Needs to search issues ("Find open bugs", "Show my tasks")
- Updates issues ("Change priority", "Assign to me", "Update status")
- Adds comments ("Comment on PROJ-123")
- Asks about projects ("List projects", "Show project info")

## Tools Reference

| Task | Tool |
|------|------|
| Search issues | `jira_search_issues` (JQL) |
| Create issue | `jira_create_issue` |
| Update issue | `jira_update_issue` |
| Get issue | `jira_get_issue` |
| Add comment | `jira_add_comment` |
| Create subtask | `jira_create_subtask` |
| List projects | `jira_get_visible_projects` |
| My issues | `jira_get_my_issues` |
| Get metadata | `jira_get_create_meta` |

## JQL Quick Reference

```
project = PROJ                    # Filter by project
status = "In Progress"            # Filter by status
assignee = currentUser()          # Your issues
priority = High                   # Filter by priority
sprint in openSprints()           # Current sprint
labels = bug                      # Filter by label
ORDER BY updated DESC             # Sort by updated
```

## Example Workflows

**Create a bug:**
```
jira_get_create_meta project="PROJ"  # Get available fields
jira_create_issue project="PROJ" issueType="Bug" summary="..." description="..."
```

**Update and comment:**
```
jira_update_issue issueKey="PROJ-123" priority="High"
jira_add_comment issueKey="PROJ-123" body="Updated priority based on..."
```
