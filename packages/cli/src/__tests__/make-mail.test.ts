import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeMail } from '../commands/make-mail.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fyron-makemail-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe('makeMail', () => {
  it('writes Mailable class and .hbs template with derived names', async () => {
    const { classPath, templatePath } = await makeMail('Welcome', { cwd: dir });
    expect(classPath.endsWith('WelcomeMail.ts')).toBe(true);
    expect(templatePath.endsWith('welcome.hbs')).toBe(true);

    const cls = await readFile(classPath, 'utf8');
    expect(cls).toContain('export class WelcomeMail extends Mailable');
    expect(cls).toContain("from 'fyron/mail'");
    expect(cls).toContain("return 'welcome';");

    const tpl = await readFile(templatePath, 'utf8');
    expect(tpl).toContain('Hello {{name}}');
    expect(tpl).toContain('welcome.hbs');
  });

  it('does not double-suffix Mail in class name or template', async () => {
    const { classPath, templatePath } = await makeMail('OrderShippedMail', { cwd: dir });
    expect(classPath.endsWith('OrderShippedMail.ts')).toBe(true);
    expect(templatePath.endsWith('order-shipped.hbs')).toBe(true);
  });

  it('rejects when files exist unless --force', async () => {
    await makeMail('Welcome', { cwd: dir });
    await expect(makeMail('Welcome', { cwd: dir })).rejects.toThrow(/already exists/);
    await expect(makeMail('Welcome', { cwd: dir, force: true })).resolves.toBeDefined();
  });
});
