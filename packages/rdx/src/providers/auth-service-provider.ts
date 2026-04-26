import { ServiceProvider } from './service-provider.js';
import { toNodeHandler } from 'better-auth/node';
import { createAuth, type RdxAuthInstance, type RdxAuthOptions } from '../auth/auth-config.js';
import type { ConfigRepository } from '../config/repository.js';

export class AuthServiceProvider extends ServiceProvider {
  override register(): void {
    if (this.app.container.has('auth')) return;
    this.app.container.singleton('auth', () => {
      const cfg = this.app.container.resolve<ConfigRepository>('config');
      const overrides = cfg.get<Partial<RdxAuthOptions>>('auth.options', {});
      return createAuth({
        db: this.app.db(),
        ...overrides,
      });
    });
  }

  override async boot(): Promise<void> {
    const cfg = this.app.container.resolve<ConfigRepository>('config');
    if (!cfg.get<boolean>('auth.enabled', false)) return;
    if (!this.app.container.has('httpKernel')) return;

    const prefix = cfg.get<string>('auth.routePrefix', '/api/auth');
    const auth = this.app.container.resolve<RdxAuthInstance>('auth');
    const handler = toNodeHandler(auth);

    this.app.httpKernel().express.use((req, res, next) => {
      const url = req.url ?? '';
      if (url === prefix || url.startsWith(prefix + '/') || url.startsWith(prefix + '?')) {
        handler(req, res).catch(next);
        return;
      }
      next();
    });
  }
}
