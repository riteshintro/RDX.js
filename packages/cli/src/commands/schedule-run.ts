import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import pc from 'picocolors';
import { loadApp } from '../load-app.js';

export interface ScheduleRunOpts {
  cwd?: string;
}

export async function scheduleRun(opts: ScheduleRunOpts = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const app = await loadApp(cwd);
  await app.boot();

  if (app.scheduler().tasks.length === 0) {
    await tryAutoload(cwd, app);
  }

  const s = app.scheduler();
  if (s.tasks.length === 0) {
    console.log(pc.yellow('No scheduled tasks registered.'));
    console.log(pc.dim('Define tasks in app/Console/Schedule.ts (default export receives the app)'));
    await app.shutdown();
    return;
  }

  s.start();
  console.log(pc.green(`✓ Scheduler running with ${s.tasks.length} task(s). Ctrl+C to stop.`));

  const stop = async () => {
    console.log(pc.dim('\nStopping scheduler...'));
    try {
      await app.shutdown();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

async function tryAutoload(cwd: string, app: unknown): Promise<void> {
  const candidates = ['app/Console/Schedule.ts', 'app/Console/Schedule.mts', 'app/Console/Schedule.js'];
  for (const c of candidates) {
    const path = resolve(cwd, c);
    if (!existsSync(path)) continue;
    const fileUrl = pathToFileURL(path).href;
    let mod: unknown;
    if (path.endsWith('.ts') || path.endsWith('.mts')) {
      const { tsImport } = await import('tsx/esm/api');
      mod = await tsImport(fileUrl, import.meta.url);
    } else {
      mod = await import(fileUrl);
    }
    const m = mod as { default?: unknown; schedule?: unknown };
    const fn = (m.default ?? m.schedule) as ((app: unknown) => unknown | Promise<unknown>) | undefined;
    if (typeof fn === 'function') await fn(app);
    return;
  }
}
