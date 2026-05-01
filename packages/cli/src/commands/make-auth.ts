import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import pc from 'picocolors';

const SCHEMA_FILE = `// Re-exports better-auth tables so drizzle-kit picks them up
// when generating migrations.
export {
  userTable as user,
  sessionTable as session,
  accountTable as account,
  verificationTable as verification,
} from 'fyron/auth';
`;

const MIDDLEWARE_FILE = `// Re-export RequireAuth so it's discoverable in your app's middleware folder.
// Use it in routes: Route.post('/posts', [...]).middleware(RequireAuth)
export { RequireAuth } from 'fyron';
`;

export interface MakeAuthOpts {
  cwd?: string;
  force?: boolean;
}

export async function makeAuth(opts: MakeAuthOpts = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const targets: Array<[string, string]> = [
    [resolve(cwd, 'database/schema/auth.ts'), SCHEMA_FILE],
    [resolve(cwd, 'app/Http/Middleware/RequireAuth.ts'), MIDDLEWARE_FILE],
  ];

  for (const [path, content] of targets) {
    if (existsSync(path) && !opts.force) {
      throw new Error(`File already exists: ${path}`);
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
    console.log(pc.green(`✓ Created ${path}`));
  }

  console.log(pc.bold('\nNext steps:'));
  console.log(pc.dim(`
  1. Add to bootstrap/app.ts withConfig:
     auth: {
       enabled: true,
       options: {
         secret: process.env.BETTER_AUTH_SECRET,
         baseURL: process.env.BETTER_AUTH_URL,
       },
     },

  2. Set BETTER_AUTH_SECRET (32+ chars) in .env

  3. Generate migration:  pnpm fyron make:migration init_auth

  4. Apply migration:     pnpm fyron migrate

  5. Sign-up endpoint:    POST /api/auth/sign-up/email
     body: { name, email, password }
`));
}
