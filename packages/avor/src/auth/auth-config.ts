import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { authSchema } from './schema.js';

export interface RdxAuthOptions {
  baseURL?: string;
  secret?: string;
  emailAndPassword?: { enabled?: boolean; minPasswordLength?: number; autoSignIn?: boolean };
  schema?: Record<string, unknown>;
  trustedOrigins?: string[];
  extra?: Partial<BetterAuthOptions>;
}

export interface CreateAuthArgs extends RdxAuthOptions {
  db: unknown;
}

export function createAuth(args: CreateAuthArgs) {
  const { db, ...opts } = args;
  return betterAuth({
    database: drizzleAdapter(db as Parameters<typeof drizzleAdapter>[0], {
      provider: 'pg',
      schema: opts.schema ?? authSchema,
    }),
    secret: opts.secret ?? process.env.BETTER_AUTH_SECRET ?? 'avor-dev-secret-do-not-use-in-prod',
    baseURL: opts.baseURL ?? process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: opts.emailAndPassword?.enabled ?? true,
      minPasswordLength: opts.emailAndPassword?.minPasswordLength ?? 8,
      autoSignIn: opts.emailAndPassword?.autoSignIn ?? true,
    },
    trustedOrigins: opts.trustedOrigins,
    ...opts.extra,
  });
}

export type RdxAuthInstance = ReturnType<typeof createAuth>;
