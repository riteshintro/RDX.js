import { sql } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

export default async function seed(db: PgliteDatabase): Promise<void> {
  await db.execute(sql`INSERT INTO users (name) VALUES ('Alice'), ('Bob');`);
}
