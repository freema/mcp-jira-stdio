# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-01-31

### Fixed

- Fixed `jira_get_issue` tool to properly extract issue keys from Jira URLs
  - Tool now correctly handles URLs like `https://your.atlassian.net/browse/PROJECT-123`
  - Extracts issue key from URL before making API call
  - Maintains backward compatibility with plain issue keys
  - Fixes 404 errors when users paste Jira URLs

### Changed

- Improved URL parsing in `jira_get_issue` using existing `extractIssueKey` utility function
- Enhanced test coverage for URL parsing scenarios

## [1.3.0] - Previous Release

### Added

- Initial stable release with core Jira MCP tools
- Support for issue management (get, create, update)
- Search functionality with JQL
- Project and metadata tools
- Authentication with Jira Cloud API
- Docker support
- Comprehensive test coverage

---

[1.4.0]: https://github.com/freema/mcp-jira-stdio/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/freema/mcp-jira-stdio/releases/tag/v1.3.0
