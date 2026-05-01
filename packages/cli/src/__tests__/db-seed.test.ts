import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { dbSeed } from '../commands/db-seed.js';
import { loadApp } from '../load-app.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const fixtureDir = (name: string) => resolve(here, '..', '..', 'tests', 'fixtures', name);

describe('dbSeed', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).__avox_test_pglite;
  });

  it('runs seeders alphabetically and inserts data', async () => {
    const cwd = fixtureDir('with-seeders');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await dbSeed({ cwd });

    log.mockRestore();

    const app = await loadApp(cwd);
    await app.boot();
    const db = app.db<{ execute: (q: ReturnType<typeof sql>) => Promise<{ rows: { name: string }[] }> }>();
    const result = await db.execute(sql`SELECT name FROM users ORDER BY id`);
    const names = result.rows.map((r) => r.name);
    expect(names).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('honors --only filter to run a single seeder', async () => {
    const cwd = fixtureDir('with-seeders');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await dbSeed({ cwd, only: '02-bonus' });

    log.mockRestore();

    const app = await loadApp(cwd);
    await app.boot();
    const db = app.db<{ execute: (q: ReturnType<typeof sql>) => Promise<{ rows: { name: string }[] }> }>();
    const result = await db.execute(sql`SELECT name FROM users WHERE name = 'Carol'`);
    expect(result.rows).toHaveLength(1);
  });
});
