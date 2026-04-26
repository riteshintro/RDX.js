import { resolve } from 'node:path';
import { cac } from 'cac';
import pc from 'picocolors';
import { scaffold } from './scaffold.js';

const cli = cac('create-rdx-app');

cli
  .command('[name]', 'Create a new rdx application')
  .option('--rdx-version <v>', 'rdx version', { default: '^0.0.1' })
  .option('--cli-version <v>', '@rdx/cli version', { default: '^0.0.1' })
  .action(async (name: string | undefined, opts: { rdxVersion?: string; cliVersion?: string }) => {
    const projectName = name ?? 'my-rdx-app';
    const targetDir = resolve(process.cwd(), projectName);
    console.log(pc.bold(`\nCreating ${pc.cyan(projectName)} at ${pc.dim(targetDir)}\n`));
    await scaffold({
      name: projectName,
      targetDir,
      rdxVersion: opts.rdxVersion,
      cliVersion: opts.cliVersion,
    });
    console.log(pc.green('✓ Project created.'));
    console.log(pc.bold('\nNext steps:\n'));
    console.log(`  cd ${projectName}`);
    console.log('  pnpm install');
    console.log('  cp .env.example .env  # set DATABASE_URL');
    console.log('  pnpm rdx serve');
    console.log('');
  });

cli.help();
cli.version('0.0.1');
cli.parse();
