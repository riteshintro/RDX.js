import { sql } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

export const seed = async (db: PgliteDatabase): Promise<void> => {
  await db.execute(sql`INSERT INTO users (name) VALUES ('Carol');`);
};
