import { resolve } from 'node:path';
import { cac } from 'cac';
import pc from 'picocolors';
import { scaffold } from './scaffold.js';

declare const __PACKAGE_VERSION__: string;
const defaultVersion = `^${__PACKAGE_VERSION__}`;

const cli = cac('create-fyron-app');

cli
  .command('[name]', 'Create a new fyron application')
  .option('--core-version <v>', 'fyron core version', { default: defaultVersion })
  .option('--cli-version <v>', '@fyron/cli version', { default: defaultVersion })
  .action(async (name: string | undefined, opts: { coreVersion?: string; cliVersion?: string }) => {
    const projectName = name ?? 'my-fyron-app';
    const targetDir = resolve(process.cwd(), projectName);
    console.log(pc.bold(`\nCreating ${pc.cyan(projectName)} at ${pc.dim(targetDir)}\n`));
    await scaffold({
      name: projectName,
      targetDir,
      coreVersion: opts.coreVersion,
      cliVersion: opts.cliVersion,
    });
    console.log(pc.green('✓ Project created.'));
    console.log(pc.bold('\nNext steps:\n'));
    console.log(`  cd ${projectName}`);
    console.log('  bun install');
    console.log('  cp .env.example .env  # set DATABASE_URL');
    console.log('  bun run dev');
    console.log('');
  });

cli.help();
cli.version(__PACKAGE_VERSION__);
cli.parse();
