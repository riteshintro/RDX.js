import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeController } from '../commands/make-controller.js';
import { makeMiddleware } from '../commands/make-middleware.js';
import { makeModel } from '../commands/make-model.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rdx-gen-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('makeController', () => {
  it('writes a controller with PascalCase + Controller suffix', async () => {
    const path = await makeController('user', { cwd: dir });
    expect(path.endsWith('UserController.ts')).toBe(true);
    const src = await readFile(path, 'utf8');
    expect(src).toContain('export class UserController');
    expect(src).toContain("from 'rdx'");
  });

  it('does not double-suffix Controller', async () => {
    const path = await makeController('PostController', { cwd: dir });
    expect(path.endsWith('PostController.ts')).toBe(true);
  });

  it('rejects on existing file unless --force', async () => {
    await makeController('Foo', { cwd: dir });
    await expect(makeController('Foo', { cwd: dir })).rejects.toThrow(/already exists/);
    await expect(makeController('Foo', { cwd: dir, force: true })).resolves.toBeDefined();
  });
});

describe('makeMiddleware', () => {
  it('writes an injectable Middleware implementing handle()', async () => {
    const path = await makeMiddleware('require-auth', { cwd: dir });
    expect(path.endsWith('RequireAuth.ts')).toBe(true);
    const src = await readFile(path, 'utf8');
    expect(src).toContain('export class RequireAuth');
    expect(src).toContain('implements Middleware');
    expect(src).toContain('@injectable()');
    expect(src).toContain('handle(_req: Request, _res: Response, next: NextFunction)');
  });
});

describe('makeModel', () => {
  it('writes a Model with a pluralized snake_case table reference', async () => {
    const path = await makeModel('User', { cwd: dir });
    const src = await readFile(path, 'utf8');
    expect(src).toContain('export class User extends Model');
    expect(src).toContain('usersTable');
    expect(src).toContain("from '../../database/schema/users.js'");
  });

  it('handles -y → -ies pluralization', async () => {
    const path = await makeModel('Country', { cwd: dir });
    const src = await readFile(path, 'utf8');
    expect(src).toContain('countriesTable');
  });
});
