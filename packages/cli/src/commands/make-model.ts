import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import Handlebars from 'handlebars';
import pc from 'picocolors';
import { pascalCase, snakeCase, pluralize } from '../util/case.js';
import type { MakeOpts } from './make-controller.js';

const TEMPLATE = `import { Model } from 'fyronjs/database';
import { {{tableConst}} } from '../../database/schema/{{tableFile}}.js';

export class {{className}} extends Model<typeof {{tableConst}}> {
  static override readonly table = {{tableConst}};
}
`;

export async function makeModel(name: string, opts: MakeOpts = {}): Promise<string> {
  const cwd = opts.cwd ?? process.cwd();
  const className = pascalCase(name);
  const tableFile = pluralize(snakeCase(className));
  const tableConst = `${tableFile}Table`;
  const target = resolve(cwd, 'app/Models', `${className}.ts`);

  if (existsSync(target) && !opts.force) {
    throw new Error(`Model already exists: ${target}`);
  }

  await mkdir(dirname(target), { recursive: true });
  const tpl = Handlebars.compile(TEMPLATE, { noEscape: true });
  await writeFile(target, tpl({ className, tableConst, tableFile }), 'utf8');

  console.log(pc.green(`✓ Created ${target}`));
  return target;
}
