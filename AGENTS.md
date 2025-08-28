# Repository Guidelines

## Project Structure & Modules
- `src/`: TypeScript source.
  - `index.ts`: MCP server entry.
  - `config/`, `tools/`, `types/`, `utils/`: Configuration, MCP tools, shared types, helpers.
- `tests/`: Vitest tests (`unit/`, optional `integration/`), plus `mocks/` and `fixtures/`.
- `scripts/`: Utility scripts (e.g., `test-connection.cjs`).
- `dist/`: Build output (ESM). Do not edit.

## Build, Test, and Development
- `npm run dev`: Start in watch mode (tsx).
- `npm run build`: Bundle with `tsup` to `dist/`.
- `npm start`: Run built server.
- `npm run typecheck`: TypeScript checks only.
- `npm run lint` | `lint:fix`: ESLint (TypeScript + Prettier plugin).
- `npm run format` | `format:check`: Prettier write/check.
- `npm test`: Run Vitest. `test:coverage` for coverage, `test:watch` for watch.
- `npm run inspector` | `inspector:dev`: Launch MCP Inspector (prod/dev).
- Example: `node scripts/test-connection.cjs` verifies Jira credentials.
Note: Node.js >= 18 required. `task` aliases exist in `Taskfile.yaml` if you prefer Task.

## Coding Style & Naming
- Language: TypeScript (ESM). Formatting via Prettier (2‑space indent). Lint via ESLint.
- Types/interfaces: PascalCase (`IssueType`). Vars/functions: camelCase. Files: kebab-case in `src/` (e.g., `get-visible-projects.ts`).
- Unused params: prefix with `_` to satisfy `@typescript-eslint/no-unused-vars` rule.
- Console usage is allowed; keep logs purposeful and minimal.

## Testing Guidelines
- Framework: Vitest with V8 coverage. Thresholds: 80% (branches, functions, lines, statements).
- Location: add tests under `tests/unit/**` (and `tests/integration/**` if needed).
- Naming: `*.test.ts`. Use `tests/mocks/` and `tests/fixtures/` helpers; global setup in `tests/setup.ts`.
- Run locally: `npm test` or `npm run test:coverage` before submitting.

## Commit & Pull Requests
- Commits: Prefer Conventional Commits (e.g., `feat(tools): add get-issue`), concise scope, imperative mood.
- Before pushing: `npm run check` + `npm test` must pass; ensure `npm run build` succeeds.
- PRs: clear description, linked issues, reproduction/verification steps, relevant logs/screenshots, and notes on config changes (`.env`). Update README/docs when behavior changes.

## Security & Configuration
- Never commit secrets. Copy `.env.example` to `.env` and set `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.
- Validate credentials with `node scripts/test-connection.cjs` before using the MCP Inspector or client integration.
