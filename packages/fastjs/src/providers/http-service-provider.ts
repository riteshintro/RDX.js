import { ServiceProvider } from './service-provider.js';
import { HttpKernel, type MultipartLimits } from '../http/kernel.js';
import type { Logger } from '../logging/logger.js';
import type { ConfigRepository } from '../config/repository.js';
import type { ExceptionRenderer } from '../http/exception-handler.js';

interface MultipartConfig extends MultipartLimits {
  enabled?: boolean;
}

export class HttpServiceProvider extends ServiceProvider {
  override register(): void {
    this.app.container.singleton(HttpKernel, (c) => {
      const logger = c.resolve<Logger>('logger');
      const config = c.resolve<ConfigRepository>('config');
      const mp = config.get<MultipartConfig>('http.multipart', {});
      return new HttpKernel(c, logger, {
        bodyLimit: config.get<number>('http.bodyLimit', 1024 * 1024),
        trustProxy: config.get<boolean | number | string>('http.trustProxy', false),
        exceptionRenderer: config.get<ExceptionRenderer | undefined>('http.exceptionRenderer'),
        multipart: mp.enabled === false ? false : mp,
      });
    });
    this.app.container.bind('httpKernel', (c) => c.resolve(HttpKernel));
  }
}
