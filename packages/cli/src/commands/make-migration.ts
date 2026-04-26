import { spawn } from 'node:child_process';
import pc from 'picocolors';
import type { MakeOpts } from './make-controller.js';

export async function makeMigration(name: string, opts: MakeOpts = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const args = ['drizzle-kit', 'generate', `--name=${name}`];
  console.log(pc.dim(`Running: pnpm exec ${args.join(' ')}`));
  await new Promise<void>((res, rej) => {
    const child = spawn('pnpm', ['exec', ...args], {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => (code === 0 ? res() : rej(new Error(`drizzle-kit exited with code ${code}`))));
    child.on('error', rej);
  });
  console.log(pc.green(`✓ Migration generated`));
}
