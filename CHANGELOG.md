# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2025-11-10

### Added

- **New tool: `jira_search_by_epic`** - Search for all issues linked to an Epic
  - Automatically finds the correct Epic Link custom field (no need to know field IDs)
  - Eliminates complex JQL syntax like `cf[10014] = EPIC-KEY`
  - Supports subtask inclusion, pagination, and custom ordering
  - Caches Epic Link field ID for performance
  - Works across different Jira instances with different custom field configurations

- **Attachment support** via MCP Resources
  - TypeScript types for `JiraAttachment` interface
  - Attachment metadata displayed when using `expand: ["attachments"]`
  - Attachment download via `jira://attachment/{attachmentId}` URI scheme
  - Automatic base64 encoding for file transport
  - Support for all attachment types (images, PDFs, documents, etc.)
  - Enhanced issue formatter displays attachment details (filename, size, author, download URI)

### Changed

- Updated `JiraIssueFields` interface to include `attachment?: JiraAttachment[]`
- Enhanced `formatIssueResponse` to display attachment metadata with download links
- Implemented MCP `ListResourcesRequestSchema` and `ReadResourceRequestSchema` handlers
- Added `downloadAttachment` helper function in `api-helpers.ts`

### Improved

- Better UX for Epic-based searches - no custom field knowledge required
- Complete attachment workflow from metadata to download
- Clearer documentation with examples for new features

## [1.5.3] - 2025-01-06

### Fixed

- Fixed `jira_get_create_meta` to properly return custom field metadata and allowed values
  - Changed to use classic `/issue/createmeta` endpoint with `expand` parameter for better reliability
  - Now correctly returns `allowedValues` for select/radio/checkbox custom fields
  - Fixes "Resource not found or insufficient permissions" errors on some Jira instances
  - Enables automated issue creation in projects with required custom fields
  - Simplified implementation from per-issue-type endpoint to classic endpoint

### Changed

- Removed unused imports and variables to pass linter checks
- Updated test suite to match new `getCreateMeta` implementation
- All 222 tests passing

### Added

- Documentation for `jira_get_create_meta` tool in README.md

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
