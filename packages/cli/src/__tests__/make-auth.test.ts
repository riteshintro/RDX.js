import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeAuth } from '../commands/make-auth.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'avox-make-auth-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe('makeAuth', () => {
  it('writes schema and middleware files in expected paths', async () => {
    await makeAuth({ cwd: dir });

    const schema = await readFile(join(dir, 'database/schema/auth.ts'), 'utf8');
    expect(schema).toContain("from 'avoxjs/auth'");
    expect(schema).toMatch(/userTable as user/);
    expect(schema).toMatch(/sessionTable as session/);
    expect(schema).toMatch(/accountTable as account/);
    expect(schema).toMatch(/verificationTable as verification/);

    const mw = await readFile(join(dir, 'app/Http/Middleware/RequireAuth.ts'), 'utf8');
    expect(mw).toContain("export { RequireAuth } from 'avoxjs'");
  });

  it('rejects when files already exist unless --force', async () => {
    await makeAuth({ cwd: dir });
    await expect(makeAuth({ cwd: dir })).rejects.toThrow(/already exists/);
    await expect(makeAuth({ cwd: dir, force: true })).resolves.toBeUndefined();
  });
});
