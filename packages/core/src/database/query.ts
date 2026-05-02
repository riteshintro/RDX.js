import { and, asc, desc, sql, type SQL } from 'drizzle-orm';
import type { Model } from './model.js';

export class QueryBuilder<M extends typeof Model> {
  private readonly conditions: SQL[] = [];
  private readonly orders: SQL[] = [];
  private limitN: number | undefined;
  private offsetN: number | undefined;

  constructor(private readonly model: M) {}

  where(condition: SQL): this {
    this.conditions.push(condition);
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  offset(n: number): this {
    this.offsetN = n;
    return this;
  }

  orderBy(column: unknown, direction: 'asc' | 'desc' = 'asc'): this {
    this.orders.push(direction === 'asc' ? asc(column as never) : desc(column as never));
    return this;
  }

  async get(): Promise<InstanceType<M>[]> {
    const m = this.model as unknown as {
      db: () => any;
      table: any;
      hydrate: (r: Record<string, unknown>) => InstanceType<M>;
    };
    let q = m.db().select().from(m.table);
    if (this.conditions.length) q = q.where(and(...this.conditions));
    if (this.orders.length) q = q.orderBy(...this.orders);
    if (this.limitN !== undefined) q = q.limit(this.limitN);
    if (this.offsetN !== undefined) q = q.offset(this.offsetN);
    const rows = (await q) as Record<string, unknown>[];
    return rows.map((r) => m.hydrate(r));
  }

  async first(): Promise<InstanceType<M> | null> {
    const rows = await this.limit(1).get();
    return rows[0] ?? null;
  }

  async count(): Promise<number> {
    const m = this.model as unknown as { db: () => any; table: any };
    let q = m.db().select({ c: sql<number>`count(*)` }).from(m.table);
    if (this.conditions.length) q = q.where(and(...this.conditions));
    const rows = (await q) as { c: number | string }[];
    return Number(rows[0]?.c ?? 0);
  }
}
