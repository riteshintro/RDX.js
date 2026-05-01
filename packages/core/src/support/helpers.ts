import { Application } from '../application.js';
import { ConfigRepository } from '../config/repository.js';
import type { Logger } from '../logging/logger.js';

export function app(): Application {
  return Application.current();
}

export function config<T = unknown>(key: string, defaultValue?: T): T {
  return app().container.resolve<ConfigRepository>('config').get<T>(key, defaultValue);
}

export function logger(): Logger {
  return app().container.resolve<Logger>('logger');
}
