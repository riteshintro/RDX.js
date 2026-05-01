import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import Handlebars from 'handlebars';
import pc from 'picocolors';
import { pascalCase } from '../util/case.js';
import type { MakeOpts } from './make-controller.js';

const TEMPLATE = `import type { Middleware, Request, Response } from 'fyronjs';
import type { NextFunction } from 'express';
import { injectable } from 'tsyringe';

@injectable()
export class {{className}} implements Middleware {
  handle(_req: Request, _res: Response, next: NextFunction) {
    next();
  }
}
`;

export async function makeMiddleware(name: string, opts: MakeOpts = {}): Promise<string> {
  const cwd = opts.cwd ?? process.cwd();
  const className = pascalCase(name);
  const target = resolve(cwd, 'app/Http/Middleware', `${className}.ts`);

  if (existsSync(target) && !opts.force) {
    throw new Error(`Middleware already exists: ${target}`);
  }

  await mkdir(dirname(target), { recursive: true });
  const tpl = Handlebars.compile(TEMPLATE, { noEscape: true });
  await writeFile(target, tpl({ className }), 'utf8');

  console.log(pc.green(`✓ Created ${target}`));
  return target;
}
