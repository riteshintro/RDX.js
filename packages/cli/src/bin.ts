import 'reflect-metadata';
import { cac } from 'cac';
import pc from 'picocolors';
import { serve } from './commands/serve.js';
import { routeList } from './commands/route-list.js';
import { makeController } from './commands/make-controller.js';
import { makeMiddleware } from './commands/make-middleware.js';
import { makeModel } from './commands/make-model.js';
import { makeMigration } from './commands/make-migration.js';
import { makeAuth } from './commands/make-auth.js';
import { makeMail } from './commands/make-mail.js';
import { migrate } from './commands/migrate.js';
import { dbSeed } from './commands/db-seed.js';
import { scheduleRun } from './commands/schedule-run.js';
import { scheduleList } from './commands/schedule-list.js';

const cli = cac('avox');

cli
  .command('serve', 'Start the HTTP server')
  .option('-p, --port <port>', 'Listen port', { default: 8000 })
  .option('-h, --host <host>', 'Listen host', { default: '127.0.0.1' })
  .action((opts) => serve(opts));

cli.command('route:list', 'List registered routes').action(() => routeList());

cli
  .command('make:controller <name>', 'Generate a controller')
  .option('--force', 'Overwrite if exists')
  .action((name: string, opts: { force?: boolean }) => makeController(name, { force: opts.force }));

cli
  .command('make:middleware <name>', 'Generate a middleware')
  .option('--force', 'Overwrite if exists')
  .action((name: string, opts: { force?: boolean }) => makeMiddleware(name, { force: opts.force }));

cli
  .command('make:model <name>', 'Generate a model')
  .option('--force', 'Overwrite if exists')
  .action((name: string, opts: { force?: boolean }) => makeModel(name, { force: opts.force }));

cli
  .command('make:migration <name>', 'Generate a Drizzle migration (delegates to drizzle-kit)')
  .action((name: string) => makeMigration(name));

cli
  .command('make:auth', 'Scaffold better-auth schema + RequireAuth middleware')
  .option('--force', 'Overwrite if exists')
  .action((opts: { force?: boolean }) => makeAuth({ force: opts.force }));

cli
  .command('migrate', 'Run pending database migrations')
  .option('--folder <path>', 'Migrations folder')
  .action((opts: { folder?: string }) => migrate({ folder: opts.folder }));

cli
  .command('db:seed', 'Run database seeders')
  .option('--folder <path>', 'Seeders folder')
  .option('--only <name>', 'Run only the seeder matching this filename')
  .action((opts: { folder?: string; only?: string }) => dbSeed({ folder: opts.folder, only: opts.only }));

cli
  .command('make:mail <name>', 'Generate a Mailable class + .hbs template')
  .option('--force', 'Overwrite if exists')
  .action((name: string, opts: { force?: boolean }) => makeMail(name, { force: opts.force }));

cli
  .command('schedule:run', 'Start the cron scheduler')
  .action(() => scheduleRun());

cli
  .command('schedule:list', 'List registered scheduled tasks')
  .action(() => scheduleList());

cli.help();
cli.version('0.0.1');

cli.parse(process.argv, { run: false });

if (!cli.matchedCommand) {
  cli.outputHelp();
  process.exit(0);
}

cli.runMatchedCommand().catch((err: Error) => {
  console.error(pc.red(err.message ?? String(err)));
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
