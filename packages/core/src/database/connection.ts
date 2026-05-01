import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';

export type RdxDatabase = ReturnType<typeof drizzlePg>;

export interface DbConfig {
  url?: string;
  pool?: PoolConfig;
}

export function createPgConnection(config: DbConfig): { db: RdxDatabase; pool: Pool } {
  const url = config.url ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('No database URL configured. Set DATABASE_URL or config.database.url');
  }
  const pool = new Pool({ connectionString: url, ...config.pool });
  const db = drizzlePg(pool);
  return { db, pool };
}
