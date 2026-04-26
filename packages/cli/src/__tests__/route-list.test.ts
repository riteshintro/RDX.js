import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeList } from '../commands/route-list.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const fixtureDir = (name: string) => resolve(here, '..', '..', 'tests', 'fixtures', name);

describe('routeList', () => {
  it('reports no routes for an empty app', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await routeList({ cwd: fixtureDir('empty') });
    const out = log.mock.calls.map((c) => String(c[0])).join('\n');
    log.mockRestore();
    expect(out).toMatch(/No routes registered/);
  });

  it('lists registered routes with method and path', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await routeList({ cwd: fixtureDir('with-routes') });
    const out = log.mock.calls.map((c) => String(c[0])).join('\n');
    log.mockRestore();

    expect(out).toMatch(/GET/);
    expect(out).toMatch(/\/health/);
    expect(out).toMatch(/POST/);
    expect(out).toMatch(/\/items/);
    expect(out).toMatch(/health/);
    expect(out).toMatch(/items\.store/);
  });
});
