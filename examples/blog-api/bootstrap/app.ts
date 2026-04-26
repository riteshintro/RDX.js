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
        options: {
          secret: process.env.BETTER_AUTH_SECRET ?? 'change-me-in-production-32chars-min',
          baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.APP_PORT ?? 3000}`,
        },
      },
      logging: {
        level: process.env.LOG_LEVEL ?? 'info',
      },
    })
    .loadRoutesFrom(() => import('../routes/api.js'));
}
