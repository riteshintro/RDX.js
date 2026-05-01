import pc from 'picocolors';
import { loadApp } from '../load-app.js';

export interface ServeOpts {
  port?: number | string;
  host?: string;
  cwd?: string;
}

export async function serve(opts: ServeOpts = {}): Promise<void> {
  const app = await loadApp(opts.cwd);
  await app.boot();
  const port = opts.port !== undefined ? Number(opts.port) : undefined;
  const server = await app.listen(port, opts.host);
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : port;
  console.log(pc.green(`✓ fyron server ready at http://${opts.host ?? '127.0.0.1'}:${actualPort}`));

  const stop = async () => {
    console.log(pc.dim('\nShutting down...'));
    try { await app.shutdown(); } catch { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
