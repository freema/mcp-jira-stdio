import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios, { AxiosError } from 'axios';
import { createLogger, formatLogArg } from '../../../src/utils/logger.js';

const TOKEN = 'ATATT3xSECRET-jira-token-1234567890';

// A client configured like getAuthenticatedClient(), with an adapter standing
// in for Jira so no request leaves the test.
function failingClient(status: number, data: unknown) {
  return axios.create({
    baseURL: 'https://example.atlassian.net/rest/api/3',
    auth: { username: 'me@example.com', password: TOKEN },
    // Rejects the way axios' own adapters do for a non-2xx answer.
    adapter: async (config) => {
      const response = { data, status, statusText: 'Error', headers: {}, config };
      throw new AxiosError(
        `Request failed with status code ${status}`,
        status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
        config,
        {},
        response
      );
    },
  });
}

async function axiosErrorFor(status: number, data: unknown) {
  try {
    await failingClient(status, data).get('/search/jql');
  } catch (error) {
    return error;
  }
  throw new Error('request did not fail');
}

describe('logger', () => {
  let output: string;

  beforeEach(() => {
    process.env.JIRA_API_TOKEN = TOKEN;
    output = '';
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      output += args.join(' ') + '\n';
    });
  });

  it.each([400, 403, 500, 503])('keeps the API token out of a logged %i error', async (status) => {
    const error = await axiosErrorFor(status, { errorMessages: ['Field does not exist'] });
    // The raw error does carry the token, which is what used to be logged.
    expect(JSON.stringify(error)).toContain(TOKEN);

    createLogger('tool:test').error('Error in handleSearchIssues:', error);

    expect(output).not.toContain(TOKEN);
    expect(output).toContain(`"status":${status}`);
    expect(output).toContain('https://example.atlassian.net/rest/api/3/search/jql');
    expect(output).toContain('Field does not exist');
  });

  it('redacts credentials in plain objects', () => {
    const text = formatLogArg({
      config: { auth: { username: 'me', password: TOKEN }, headers: { Authorization: 'x' } },
      nested: [{ apiToken: 'abc' }],
    });
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain('"abc"');
    expect(text).toContain('[REDACTED]');
  });

  it('scrubs the token, Basic credentials and URL userinfo from strings', () => {
    const basic = Buffer.from(`me@example.com:${TOKEN}`).toString('base64');
    const text = formatLogArg(
      `token ${TOKEN}; Authorization: Basic ${basic}; https://me:${TOKEN}@example.atlassian.net`
    );
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain(basic);
  });

  it('survives circular objects', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    expect(formatLogArg(a)).toContain('[Circular]');
  });
});
