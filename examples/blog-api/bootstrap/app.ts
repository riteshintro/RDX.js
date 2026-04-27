import 'reflect-metadata';
import { Application } from 'rdx';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const basePath = resolve(here, '..');

export default async function createApp(): Promise<Application> {
  return new Application(basePath)
    .withConfig({
      app: {
        name: 'blog-api',
        port: Number(process.env.APP_PORT ?? 3000),
      },
      database: {
        url: process.env.DATABASE_URL,
      },
      auth: {
        enabled: true,
        email: {
          requireVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true',
          sendOnSignUp: process.env.AUTH_SEND_VERIFICATION_ON_SIGNUP === 'true',
        },
        options: {
          secret: process.env.BETTER_AUTH_SECRET ?? 'change-me-in-production-32chars-min',
          baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.APP_PORT ?? 3000}`,
        },
      },
      mail: {
        transport: (process.env.MAIL_TRANSPORT ?? 'json') as 'smtp' | 'json' | 'stream' | 'sendmail',
        from: process.env.MAIL_FROM,
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : undefined,
        secure: process.env.MAIL_SECURE === 'true',
        auth: process.env.MAIL_USER && process.env.MAIL_PASS
          ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
          : undefined,
      },
      logging: {
        level: process.env.LOG_LEVEL ?? 'info',
      },
    })
    .loadRoutesFrom(() => import('../routes/api.js'));
}
