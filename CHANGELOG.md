# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0] - 2025-01-15

### Added

- **URL-based attachment upload**: Token-efficient method for attaching files (~60 tokens vs ~330k for 1MB file)
  - New `fileUrl` parameter in `jira_add_attachment` tool
  - Downloads file from URL and uploads to Jira
  - Recommended for large files - upload to Dropbox/S3/imgur first, then provide URL
  - Supports content-type detection from response headers
  - 50 MB file size limit, 30 second timeout

- **SSRF protection**: Comprehensive security for URL downloads
  - Blocks localhost (127.x.x.x)
  - Blocks private networks (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  - URL validation and protocol whitelist (http/https only)
  - Prevents Server-Side Request Forgery attacks

- **Node.js 24.x support**: Added Node.js 24.x to GitHub Actions CI matrix

### Changed

- **Attachment upload optimization**: `jira_add_attachment` now supports two methods:
  - `fileUrl` (recommended): Efficient URL-based upload (~60 tokens)
  - `content` (legacy): Base64/plain text content (high token cost, only for small files)
- **Schema refinement**: Exactly one source (fileUrl or content) must be provided
- **Enhanced descriptions**: Tool descriptions now include token efficiency guidance and best practices

### Fixed

- GitHub Actions publish workflow now uses Node.js 20.x (meets minimum requirement)
- Added missing test file: `tests/unit/utils/attachment-url.test.ts`

### Tests

- Added 18 comprehensive SSRF protection tests
- Added 7 attachment API helper tests (addAttachment, getAttachments, deleteAttachment)
- Added schema validation refinement tests
- Total test count increased from 312 to 319 tests
- Improved coverage: api-helpers.ts from 75.94% to 79.72%

## [1.7.1] - 2025-12-09

### Fixed

- Fixed Prettier formatting issues in `src/types/tools.ts` and `src/utils/formatters.ts`
  - Corrected multi-line formatting for Zod schema chains
  - Corrected ternary operator formatting in pagination logic

## [1.7.0] - 2025-01-18

### Breaking Changes

- **Node.js requirement**: Minimum Node.js version increased from 18.0.0 to 20.0.0
  - Required for compatibility with `node:inspector/promises` module used by Vitest
  - GitHub Actions CI now tests against Node.js 20.x and 22.x only

### Security

- Fixed high severity vulnerabilities in `marked` package (transitive dependency via `md-to-adf`)
  - Added npm override to force `marked >= 4.0.10` (fixes CVE-2024-XXXXX for ReDoS vulnerabilities)
  - Resolves GHSA-rrrm-qjm4-v8hf and GHSA-5v2h-r2cx-5xgj

## [1.6.2] - 2025-01-18

### Added

- **Issue linking tool**: Added `jira_create_issue_link` tool for creating links between Jira issues
  - Supports common link types: "blocks", "relates", "duplicates", "clones"
  - Smart link type mapping and direction handling (inward/outward)
  - Intuitive parameters: `fromIssue`, `toIssue`, `linkType`
  - Full test coverage with 25 comprehensive tests

### Changed

- Merged Markdown support features from main branch (version 1.6.0)
- Updated dependencies and regenerated package-lock.json

## [1.6.0] - 2025-01-10

### Added

- **Markdown support**: Added optional `format` parameter to `jira_create_issue`, `jira_update_issue`, `jira_create_subtask`, and `jira_add_comment` tools
  - Three format options:
    - `markdown` (default): Automatically converts Markdown syntax to Atlassian Document Format (ADF)
    - `adf`: Uses description/comment as-is (assumes it's already in ADF format)
    - `plain`: Converts plain text to ADF with basic formatting heuristics
  - Backward compatible: defaults to `markdown` format
  - Automatic fallback to plain text if markdown conversion fails
- Added `md-to-adf` package (v0.6.4) for Markdown → ADF conversion
- Comprehensive test coverage for format parameter functionality (230 tests passing)
- Type declarations for `md-to-adf` module

### Changed

- Updated tool descriptions to reflect new format parameter
- Enhanced `ensureAdfDescription` function to handle all three formats
- Updated all tool schemas (Zod) to include format parameter with default value

### Technical Details

- All changes maintain backward compatibility
- Error handling includes fallback to plain text conversion if markdown parsing fails
- Full type safety with TypeScript type definitions

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
