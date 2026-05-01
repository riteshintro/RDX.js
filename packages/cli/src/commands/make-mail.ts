import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import pc from 'picocolors';
import { pascalCase, kebabCase } from '../util/case.js';
import type { MakeOpts } from './make-controller.js';

const CLASS_TEMPLATE = `import { Mailable } from 'fyron/mail';

export interface __CLASS__Payload {
  // shape your payload here
  name: string;
}

export class __CLASS__ extends Mailable<__CLASS__Payload> {
  override subject(payload: __CLASS__Payload): string {
    return \`Hello \${payload.name}\`;
  }

  override template(): string {
    return '__TEMPLATE__';
  }

  override async data(payload: __CLASS__Payload): Promise<Record<string, unknown>> {
    return { name: payload.name };
  }
}
`;

const TEMPLATE_FILE = `<!doctype html>
<html>
<body style="font-family: -apple-system, system-ui, sans-serif;">
  <h1>Hello {{name}}</h1>
  <p>This is the __CLASS__ template. Customize it in resources/mail/__TEMPLATE__.hbs.</p>
</body>
</html>
`;

function render(tpl: string, vars: { className: string; templateName: string }): string {
  return tpl.replace(/__CLASS__/g, vars.className).replace(/__TEMPLATE__/g, vars.templateName);
}

export async function makeMail(name: string, opts: MakeOpts = {}): Promise<{ classPath: string; templatePath: string }> {
  const cwd = opts.cwd ?? process.cwd();
  const className = pascalCase(name).replace(/Mail$/, '') + 'Mail';
  const templateName = kebabCase(className).replace(/-mail$/, '');

  const classPath = resolve(cwd, 'app/Mail', `${className}.ts`);
  const templatePath = resolve(cwd, 'resources/mail', `${templateName}.hbs`);

  if (existsSync(classPath) && !opts.force) {
    throw new Error(`Mailable already exists: ${classPath}`);
  }
  if (existsSync(templatePath) && !opts.force) {
    throw new Error(`Template already exists: ${templatePath}`);
  }

  await mkdir(dirname(classPath), { recursive: true });
  await mkdir(dirname(templatePath), { recursive: true });

  await writeFile(classPath, render(CLASS_TEMPLATE, { className, templateName }), 'utf8');
  await writeFile(templatePath, render(TEMPLATE_FILE, { className, templateName }), 'utf8');

  console.log(pc.green(`✓ Created ${classPath}`));
  console.log(pc.green(`✓ Created ${templatePath}`));
  return { classPath, templatePath };
}
