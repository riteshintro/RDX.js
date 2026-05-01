import { resolve, dirname, join, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

export interface ScaffoldOpts {
  name: string;
  targetDir: string;
  templateDir?: string;
  fyronjsVersion?: string;
  cliVersion?: string;
}

export async function scaffold(opts: ScaffoldOpts): Promise<void> {
  const templateDir = opts.templateDir ?? resolve(here, '..', 'templates', 'default');
  if (!existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }
  if (existsSync(opts.targetDir)) {
    const items = await readdir(opts.targetDir);
    if (items.length > 0) {
      throw new Error(`Target directory is not empty: ${opts.targetDir}`);
    }
  } else {
    await mkdir(opts.targetDir, { recursive: true });
  }

  await copyDir(templateDir, opts.targetDir, opts);
}

async function copyDir(src: string, dst: string, opts: ScaffoldOpts): Promise<void> {
  await mkdir(dst, { recursive: true });
  for (const entry of await readdir(src)) {
    const fromPath = join(src, entry);
    const toName = entry === '_gitignore' ? '.gitignore' : entry === '_env' ? '.env.example' : entry;
    const toPath = join(dst, toName);
    const s = await stat(fromPath);
    if (s.isDirectory()) {
      await copyDir(fromPath, toPath, opts);
    } else {
      const content = await readFile(fromPath, 'utf8');
      await mkdir(dirname(toPath), { recursive: true });
      await writeFile(toPath, applyTemplate(content, opts), 'utf8');
    }
  }
}

function applyTemplate(content: string, opts: ScaffoldOpts): string {
  return content
    .replace(/__APP_NAME__/g, opts.name)
    .replace(/__RDX_VERSION__/g, opts.fyronjsVersion ?? '^0.0.1')
    .replace(/__CLI_VERSION__/g, opts.cliVersion ?? '^0.0.1');
}

export function relativePath(from: string, to: string): string {
  return relative(from, to) || '.';
}
