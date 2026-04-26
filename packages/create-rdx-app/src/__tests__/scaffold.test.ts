import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffold } from '../scaffold.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rdx-scaffold-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('scaffold', () => {
  it('creates the project skeleton with expected files', async () => {
    const target = join(dir, 'my-app');
    await scaffold({ name: 'my-app', targetDir: target });

    const expected = [
      'package.json',
      'tsconfig.json',
      'drizzle.config.ts',
      '.gitignore',
      '.env.example',
      'bootstrap/app.ts',
      'routes/api.ts',
      'config/app.ts',
      'config/database.ts',
    ];
    for (const path of expected) {
      const full = join(target, path);
      const s = await stat(full).catch(() => null);
      expect(s, `expected ${path} to exist`).not.toBeNull();
      expect(s!.isFile()).toBe(true);
    }
  });

  it('substitutes __APP_NAME__ in template files', async () => {
    const target = join(dir, 'foo-bar');
    await scaffold({ name: 'foo-bar', targetDir: target });

    const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('foo-bar');

    const routes = await readFile(join(target, 'routes/api.ts'), 'utf8');
    expect(routes).toContain("name: 'foo-bar'");
  });

  it('rejects when target directory exists and is not empty', async () => {
    const target = join(dir, 'occupied');
    await scaffold({ name: 'a', targetDir: target });
    await expect(scaffold({ name: 'a', targetDir: target })).rejects.toThrow(/not empty/);
  });

  it('preserves the created directory tree under app/, database/', async () => {
    const target = join(dir, 'tree');
    await scaffold({ name: 'tree', targetDir: target });
    const top = await readdir(target);
    expect(top).toEqual(expect.arrayContaining(['app', 'bootstrap', 'config', 'database', 'routes']));
  });
});
