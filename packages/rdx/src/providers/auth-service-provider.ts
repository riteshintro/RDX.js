import { ServiceProvider } from './service-provider.js';
import { toNodeHandler } from 'better-auth/node';
import { createAuth, type RdxAuthInstance, type RdxAuthOptions } from '../auth/auth-config.js';
import { VerifyEmailMail, ResetPasswordMail } from '../auth/mailables.js';
import type { ConfigRepository } from '../config/repository.js';
import type { Mailer } from '../mail/mailer.js';

interface AuthEmailConfig {
  enabled?: boolean;
  requireVerification?: boolean;
  sendOnSignUp?: boolean;
  appName?: string;
}

export class AuthServiceProvider extends ServiceProvider {
  override register(): void {
    if (this.app.container.has('auth')) return;
    this.app.container.singleton('auth', () => {
      const cfg = this.app.container.resolve<ConfigRepository>('config');
      const overrides = cfg.get<Partial<RdxAuthOptions>>('auth.options', {});
      const mailCfg = cfg.get<AuthEmailConfig>('auth.email', {});
      const appName = mailCfg.appName ?? cfg.get<string>('app.name');

      const extra: Partial<RdxAuthOptions['extra']> = { ...overrides.extra };

      if (mailCfg.enabled !== false && this.app.container.has('mailer')) {
        const mailer = this.app.container.resolve<Mailer>('mailer');

        extra.emailVerification = {
          ...(extra.emailVerification ?? {}),
          sendOnSignUp: mailCfg.sendOnSignUp ?? false,
          autoSignInAfterVerification: extra.emailVerification?.autoSignInAfterVerification ?? true,
          sendVerificationEmail: async (
            { user, url }: { user: { email: string; name?: string | null }; url: string },
          ) => {
            await mailer.send(VerifyEmailMail, user.email, {
              name: user.name,
              email: user.email,
              url,
              appName,
            });
          },
        };

        extra.emailAndPassword = {
          ...(extra.emailAndPassword ?? {}),
          enabled: extra.emailAndPassword?.enabled ?? true,
          requireEmailVerification:
            mailCfg.requireVerification ?? extra.emailAndPassword?.requireEmailVerification ?? false,
          sendResetPassword: async (
            { user, url }: { user: { email: string; name?: string | null }; url: string },
          ) => {
            await mailer.send(ResetPasswordMail, user.email, {
              name: user.name,
              email: user.email,
              url,
              appName,
            });
          },
        };
      }

      return createAuth({
        db: this.app.db(),
        ...overrides,
        extra,
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

    this.app.httpKernel().fastify.addHook('onRequest', async (req, reply) => {
      const url = req.url ?? '';
      if (url === prefix || url.startsWith(prefix + '/') || url.startsWith(prefix + '?')) {
        reply.hijack();
        await handler(req.raw, reply.raw);
      }
    });
  }
}
