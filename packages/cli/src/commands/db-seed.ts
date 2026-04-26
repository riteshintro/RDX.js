import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { glob } from 'tinyglobby';
import pc from 'picocolors';
import { loadApp } from '../load-app.js';

export interface DbSeedOpts {
  cwd?: string;
  folder?: string;
  only?: string;
}

export async function dbSeed(opts: DbSeedOpts = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const app = await loadApp(cwd);
  await app.boot();
  const cfg = app.config();
  const folder = opts.folder ?? cfg.get<string>('database.seedersFolder', 'database/seeders');
  const fullPath = resolve(cwd, folder);

  if (!existsSync(fullPath)) {
    console.log(pc.yellow(`No seeders folder at ${fullPath}`));
    await app.shutdown();
    return;
  }

  const pattern = opts.only ? `**/${opts.only}.{ts,mts,js,mjs}` : '**/*.{ts,mts,js,mjs}';
  const files = (await glob([pattern], { cwd: fullPath, absolute: true })).sort();

  if (files.length === 0) {
    console.log(pc.yellow(`No seeders matched in ${folder}`));
    await app.shutdown();
    return;
  }

  const db = app.db();
  for (const file of files) {
    const fileUrl = pathToFileURL(file).href;
    let mod: unknown;
    if (file.endsWith('.ts') || file.endsWith('.mts')) {
      const { tsImport } = await import('tsx/esm/api');
      mod = await tsImport(fileUrl, import.meta.url);
    } else {
      mod = await import(fileUrl);
    }
    const m = mod as { default?: unknown; seed?: unknown };
    const fn = (m.default ?? m.seed) as ((db: unknown, app: unknown) => unknown | Promise<unknown>) | undefined;
    if (typeof fn !== 'function') {
      console.log(pc.yellow(`Skipping ${file} (no default or 'seed' export)`));
      continue;
    }
    console.log(pc.dim(`→ ${file.split(/[\\/]/).pop()}`));
    await fn(db, app);
  }

  console.log(pc.green(`✓ Seeded ${files.length} file(s)`));
  await app.shutdown();
}
