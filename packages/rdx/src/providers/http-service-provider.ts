import { ServiceProvider } from './service-provider.js';
import { HttpKernel } from '../http/kernel.js';
import type { Logger } from '../logging/logger.js';
import type { ConfigRepository } from '../config/repository.js';

export class HttpServiceProvider extends ServiceProvider {
  override register(): void {
    this.app.container.singleton(HttpKernel, (c) => {
      const logger = c.resolve<Logger>('logger');
      const config = c.resolve<ConfigRepository>('config');
      return new HttpKernel(c, logger, {
        jsonLimit: config.get<string>('http.jsonLimit', '1mb'),
        trustProxy: config.get<boolean | number | string>('http.trustProxy', false),
      });
    });
    this.app.container.bind('httpKernel', (c) => c.resolve(HttpKernel));
  }
}
