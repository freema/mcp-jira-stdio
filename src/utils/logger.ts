type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
};

function getLevel(): LogLevel {
  const env = (
    process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info')
  ).toLowerCase();
  if (env === 'debug' || env === 'info' || env === 'warn' || env === 'error' || env === 'silent')
    return env;
  return 'info';
}

const REDACTED = '[REDACTED]';

// Keys whose values are credentials wherever they appear in a logged object.
const SECRET_KEYS =
  /^(auth|authorization|proxy-authorization|password|apitoken|api_token|token|cookie|set-cookie)$/i;

/**
 * A log-safe description of an error: what failed, never how the request was
 * authenticated. An AxiosError serializes its whole request config, and that
 * includes `auth.password`, the Jira API token.
 */
export function describeError(err: unknown): Record<string, unknown> {
  const e = err as any;
  const out: Record<string, unknown> = {
    name: e?.name ?? 'Error',
    message: e?.message ?? String(err),
  };
  if (e?.code) out.code = e.code;
  const status = e?.response?.status ?? e?.status;
  if (status) out.status = status;
  const config = e?.config;
  if (config?.method) out.method = String(config.method).toUpperCase();
  if (config?.url) out.url = `${config.baseURL ?? ''}${config.url}`;
  const data = e?.response?.data;
  if (Array.isArray(data?.errorMessages) && data.errorMessages.length > 0) {
    out.errorMessages = data.errorMessages;
  }
  if (data?.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
    out.errors = data.errors;
  }
  return out;
}

function redactDeep(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (value instanceof Error) return describeError(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value) || depth > 8) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, seen, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = SECRET_KEYS.test(key) ? REDACTED : redactDeep(v, seen, depth + 1);
  }
  return out;
}

// Last line of defence for strings: credentials in URLs, Basic/Bearer header
// values and the configured API token itself.
function scrubSecrets(text: string): string {
  let out = text
    .replace(/(\/\/)[^/@\s]+@/g, `$1${REDACTED}@`)
    .replace(/\b(Basic|Bearer)\s+[A-Za-z0-9+/=._~-]{16,}/g, `$1 ${REDACTED}`);
  const token = process.env.JIRA_API_TOKEN;
  if (token && token.length >= 8) {
    out = out.split(token).join(REDACTED);
  }
  return out;
}

/** Formats one logger argument with secrets removed. */
export function formatLogArg(arg: unknown): string {
  if (typeof arg === 'string') return scrubSecrets(arg);
  let text: string;
  try {
    text = JSON.stringify(redactDeep(arg, new WeakSet(), 0)) ?? String(arg);
  } catch {
    text = String(arg);
  }
  return scrubSecrets(text);
}

export function createLogger(scope: string) {
  const level = getLevel();
  const min = levels[level];

  const prefix = (lvl: string) => `[${lvl.toUpperCase()}] ${scope}:`;

  return {
    debug: (...args: any[]) => {
      if (min <= levels.debug) console.error(prefix('debug'), ...args.map(formatLogArg));
    },
    info: (...args: any[]) => {
      if (min <= levels.info) console.error(prefix('info'), ...args.map(formatLogArg));
    },
    warn: (...args: any[]) => {
      if (min <= levels.warn) console.error(prefix('warn'), ...args.map(formatLogArg));
    },
    error: (...args: any[]) => {
      if (min <= levels.error) console.error(prefix('error'), ...args.map(formatLogArg));
    },
  };
}
