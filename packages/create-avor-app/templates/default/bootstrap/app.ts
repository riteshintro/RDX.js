import 'reflect-metadata';
import { Application } from 'avor';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const basePath = resolve(here, '..');

export default async function createApp(): Promise<Application> {
  return new Application(basePath)
    .withConfig({
      app: {
        name: '__APP_NAME__',
        env: process.env.APP_ENV ?? 'local',
        port: Number(process.env.APP_PORT ?? 8000),
        host: process.env.APP_HOST ?? '127.0.0.1',
        url: process.env.APP_URL,
      },
      database: {
        url: process.env.DATABASE_URL,
      },
      logging: {
        level: process.env.LOG_LEVEL ?? 'info',
      },
      auth: {
        enabled: false, // flip to true after `pnpm avor make:auth` + migrate
        email: {
          requireVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === 'true',
          sendOnSignUp: process.env.AUTH_SEND_VERIFICATION_ON_SIGNUP === 'true',
        },
        options: {
          secret: process.env.BETTER_AUTH_SECRET,
          baseURL: process.env.BETTER_AUTH_URL,
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
    })
    .loadRoutesFrom(() => import('../routes/api.js'));
}
