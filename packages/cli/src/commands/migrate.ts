import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { loadApp } from '../load-app.js';

export interface MigrateOpts {
  cwd?: string;
  folder?: string;
}

export async function migrate(opts: MigrateOpts = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const app = await loadApp(cwd);
  await app.boot();
  const cfg = app.config();
  const folder = opts.folder ?? cfg.get<string>('database.migrationsFolder', 'database/migrations');
  const fullPath = resolve(cwd, folder);
  if (!existsSync(fullPath)) {
    console.error(pc.red(`Migrations folder not found: ${fullPath}`));
    process.exit(1);
  }
  const db = app.db<unknown>();
  const driver = cfg.get<string>('database.driver', 'pg');
  const { migrate: runMigrations } = await loadMigrator(driver);
  console.log(pc.dim(`Running migrations from ${folder}...`));
  await runMigrations(db as Parameters<typeof runMigrations>[0], { migrationsFolder: fullPath });
  console.log(pc.green('✓ Migrations complete'));
  await app.shutdown();
}

async function loadMigrator(
  driver: string,
): Promise<{ migrate: (db: unknown, opts: { migrationsFolder: string }) => Promise<void> }> {
  switch (driver) {
    case 'pg':
    case 'node-postgres':
      return (await import('drizzle-orm/node-postgres/migrator')) as unknown as {
        migrate: (db: unknown, opts: { migrationsFolder: string }) => Promise<void>;
      };
    case 'pglite':
      return (await import('drizzle-orm/pglite/migrator')) as unknown as {
        migrate: (db: unknown, opts: { migrationsFolder: string }) => Promise<void>;
      };
    default:
      throw new Error(`Unknown database driver: ${driver}`);
  }
}
