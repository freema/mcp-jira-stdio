---
description: Search Jira issues using JQL
argument-hint: <jql-query>
---

# /jira:search

Search for Jira issues using JQL (Jira Query Language).

## Usage

```
/jira:search <jql-query>
```

## Examples

```
/jira:search project = MYPROJ AND status = "To Do"
/jira:search assignee = currentUser() ORDER BY updated DESC
/jira:search labels = bug AND priority = High
/jira:search sprint in openSprints()
```

## What Happens

Calls `jira_search_issues` with the JQL query and returns matching issues with key, summary, status, assignee, and priority.
