import { Application } from 'fyronjs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

const KEY = '__fyron_test_pglite';
const g = globalThis as Record<string, unknown>;

export default async function () {
  if (!g[KEY]) {
    const client = new PGlite();
    await client.exec(`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL);`);
    g[KEY] = client;
  }
  const db = drizzle(g[KEY] as PGlite);

  const app = new Application(process.cwd()).withConfig({
    logging: { level: 'silent' },
  });
  app.container.instance('db', db as unknown as object);
  return app;
}
