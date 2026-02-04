---
description: List issues assigned to you
argument-hint: 
---

# /jira:my-issues

Show all issues currently assigned to you.

## Usage

```
/jira:my-issues
```

## What Happens

Calls `jira_get_my_issues` and returns your assigned issues sorted by last updated, showing key, summary, status, and priority.
