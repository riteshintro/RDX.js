import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Application } from 'rdx';

const CANDIDATES = ['bootstrap/app.ts', 'bootstrap/app.mts', 'bootstrap/app.js', 'bootstrap/app.mjs'];

export async function loadApp(cwd: string = process.cwd()): Promise<Application> {
  for (const c of CANDIDATES) {
    const full = resolve(cwd, c);
    if (!existsSync(full)) continue;

    let mod: unknown;
    const fileUrl = pathToFileURL(full).href;
    if (full.endsWith('.ts') || full.endsWith('.mts')) {
      const { tsImport } = await import('tsx/esm/api');
      mod = await tsImport(fileUrl, import.meta.url);
    } else {
      mod = await import(fileUrl);
    }

    const m = mod as { default?: unknown; createApp?: unknown; bootstrap?: unknown };
    const factory = (m.default ?? m.createApp ?? m.bootstrap) as
      | (() => Application | Promise<Application>)
      | undefined;

    if (typeof factory !== 'function') {
      throw new Error(`${c} must export a function (default, createApp, or bootstrap) returning an Application`);
    }
    return factory();
  }
  throw new Error(`No bootstrap/app.{ts,mts,js,mjs} found in ${cwd}`);
}
