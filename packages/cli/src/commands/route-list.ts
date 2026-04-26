import pc from 'picocolors';
import { loadApp } from '../load-app.js';

export interface RouteListOpts {
  cwd?: string;
}

export async function routeList(opts: RouteListOpts = {}): Promise<void> {
  const app = await loadApp(opts.cwd);
  await app.boot();
  const router = app.router();

  if (router.routes.length === 0) {
    console.log(pc.yellow('No routes registered.'));
    return;
  }

  const wMethod = Math.max(6, ...router.routes.map((r) => r.method.length));
  const wPath = Math.max(4, ...router.routes.map((r) => r.path.length));

  console.log(pc.bold(`${'METHOD'.padEnd(wMethod)}  ${'PATH'.padEnd(wPath)}  HANDLER`));
  console.log(pc.dim('-'.repeat(wMethod + wPath + 30)));

  for (const r of router.routes) {
    const handler = Array.isArray(r.handler)
      ? `${r.handler[0].name}@${r.handler[1]}`
      : 'closure';
    const name = r.name ? pc.dim(` (${r.name})`) : '';
    console.log(`${pc.cyan(r.method.padEnd(wMethod))}  ${r.path.padEnd(wPath)}  ${handler}${name}`);
  }
}
