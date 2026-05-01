import { ServiceProvider } from './service-provider.js';
import { Mailer, type MailConfig } from '../mail/mailer.js';
import type { Logger } from '../logging/logger.js';
import type { ConfigRepository } from '../config/repository.js';

export class MailServiceProvider extends ServiceProvider {
  override register(): void {
    if (this.app.container.has('mailer')) return;
    this.app.container.singleton('mailer', () => {
      const cfg = this.app.container.resolve<ConfigRepository>('config');
      const mailCfg = cfg.get<MailConfig>('mail', {});
      const logger = this.app.container.resolve<Logger>('logger');
      return new Mailer(mailCfg, this.app.basePath, logger);
    });
    this.app.container.bind(Mailer, (c) => c.resolve<Mailer>('mailer'));
  }
}
