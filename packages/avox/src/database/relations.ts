import { eq } from 'drizzle-orm';
import type { Model } from './model.js';

abstract class Relation<R extends typeof Model> {
  constructor(
    protected readonly parent: Model,
    protected readonly related: R,
    protected readonly foreignKey: string,
    protected readonly localKey: string,
  ) {}
}

export class HasMany<R extends typeof Model> extends Relation<R> {
  async get(): Promise<InstanceType<R>[]> {
    const r = this.related as unknown as { db: () => any; table: Record<string, unknown>; hydrate: (row: Record<string, unknown>) => InstanceType<R> };
    const localValue = (this.parent as Record<string, unknown>)[this.localKey];
    const rows = (await r.db().select().from(r.table).where(eq(r.table[this.foreignKey] as never, localValue as never))) as Record<string, unknown>[];
    return rows.map((row) => r.hydrate(row));
  }
}

export class HasOne<R extends typeof Model> extends Relation<R> {
  async get(): Promise<InstanceType<R> | null> {
    const r = this.related as unknown as { db: () => any; table: Record<string, unknown>; hydrate: (row: Record<string, unknown>) => InstanceType<R> };
    const localValue = (this.parent as Record<string, unknown>)[this.localKey];
    const rows = (await r.db().select().from(r.table).where(eq(r.table[this.foreignKey] as never, localValue as never)).limit(1)) as Record<string, unknown>[];
    return rows.length ? r.hydrate(rows[0]!) : null;
  }
}

export class BelongsTo<R extends typeof Model> extends Relation<R> {
  async get(): Promise<InstanceType<R> | null> {
    const r = this.related as unknown as { db: () => any; table: Record<string, unknown>; hydrate: (row: Record<string, unknown>) => InstanceType<R> };
    const fkValue = (this.parent as Record<string, unknown>)[this.foreignKey];
    if (fkValue === undefined || fkValue === null) return null;
    const rows = (await r.db().select().from(r.table).where(eq(r.table[this.localKey] as never, fkValue as never)).limit(1)) as Record<string, unknown>[];
    return rows.length ? r.hydrate(rows[0]!) : null;
  }
}
