---
description: Create a new Jira issue
argument-hint: <project> <type> "<summary>"
---

# /jira:create

Create a new issue in Jira.

## Usage

```
/jira:create <project-key> <issue-type> "<summary>"
```

## Examples

```
/jira:create PROJ Bug "Login button not responding"
/jira:create PROJ Story "Implement dark mode"
/jira:create PROJ Task "Update dependencies"
```

## What Happens

1. Calls `jira_get_create_meta` to get available fields
2. Creates the issue with `jira_create_issue`
3. Returns the new issue key and link
