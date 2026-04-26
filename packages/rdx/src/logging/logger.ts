import pino, { type Logger, type LoggerOptions } from 'pino';

export type { Logger } from 'pino';

export function createLogger(opts: LoggerOptions = {}): Logger {
  const isDev = process.env.NODE_ENV !== 'production';
  const base: LoggerOptions = {
    level: opts.level || process.env.LOG_LEVEL || 'info',
  };
  if (isDev && !opts.transport) {
    base.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l' },
    };
  }
  return pino({ ...base, ...opts });
}
