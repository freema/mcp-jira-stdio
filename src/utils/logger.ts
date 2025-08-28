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

export function createLogger(scope: string) {
  const level = getLevel();
  const min = levels[level];

  const fmt = (msg: any) => (typeof msg === 'string' ? msg : JSON.stringify(msg));
  const prefix = (lvl: string) => `[${lvl.toUpperCase()}] ${scope}:`;

  return {
    debug: (...args: any[]) => {
      if (min <= levels.debug) console.error(prefix('debug'), ...args.map(fmt));
    },
    info: (...args: any[]) => {
      if (min <= levels.info) console.error(prefix('info'), ...args.map(fmt));
    },
    warn: (...args: any[]) => {
      if (min <= levels.warn) console.error(prefix('warn'), ...args.map(fmt));
    },
    error: (...args: any[]) => {
      if (min <= levels.error) console.error(prefix('error'), ...args.map(fmt));
    },
  };
}
