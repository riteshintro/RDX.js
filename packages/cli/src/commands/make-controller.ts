import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import Handlebars from 'handlebars';
import pc from 'picocolors';
import { pascalCase } from '../util/case.js';

const TEMPLATE = `import type { Request, Response } from 'avox';

export class {{className}} {
  index(_req: Request, _res: Response) {
    return { message: '{{className}}@index' };
  }
}
`;

export interface MakeOpts {
  cwd?: string;
  force?: boolean;
}

export async function makeController(name: string, opts: MakeOpts = {}): Promise<string> {
  const cwd = opts.cwd ?? process.cwd();
  const className = pascalCase(name).replace(/Controller$/, '') + 'Controller';
  const target = resolve(cwd, 'app/Http/Controllers', `${className}.ts`);

  if (existsSync(target) && !opts.force) {
    throw new Error(`Controller already exists: ${target}`);
  }

  await mkdir(dirname(target), { recursive: true });
  const tpl = Handlebars.compile(TEMPLATE, { noEscape: true });
  await writeFile(target, tpl({ className }), 'utf8');

  console.log(pc.green(`✓ Created ${target}`));
  return target;
}
