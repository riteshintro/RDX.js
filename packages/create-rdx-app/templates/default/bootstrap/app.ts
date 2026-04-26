import 'reflect-metadata';
import { Application } from 'rdx';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const basePath = resolve(here, '..');

export default async function createApp(): Promise<Application> {
  return new Application(basePath)
    .withConfig({
      app: {
        name: '__APP_NAME__',
        port: Number(process.env.APP_PORT ?? 3000),
        env: process.env.APP_ENV ?? 'local',
      },
      database: {
        url: process.env.DATABASE_URL,
      },
      logging: {
        level: process.env.LOG_LEVEL ?? 'info',
      },
    })
    .loadRoutesFrom(() => import('../routes/api.js'));
}
