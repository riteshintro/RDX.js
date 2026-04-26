import { eq } from 'drizzle-orm';
import type { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import { Application } from '../application.js';
import { NotFoundException } from '../exceptions/http-exception.js';
import { QueryBuilder } from './query.js';
import { HasMany, HasOne, BelongsTo } from './relations.js';

export type AnyTable = PgTable<TableConfig>;
type AnyDb = {
  select: (..._args: any[]) => any;
  insert: (table: AnyTable) => any;
  update: (table: AnyTable) => any;
  delete: (table: AnyTable) => any;
};

const ATTRS = Symbol.for('rdx.modelAttrs');

export abstract class Model {
  static table: AnyTable;
  static primaryKey = 'id';

  [key: string]: any;

  static db(): AnyDb {
    return Application.current().container.resolve<AnyDb>('db');
  }

  static async find<M extends typeof Model>(this: M, id: number | string): Promise<InstanceType<M> | null> {
    const t = this.table as unknown as Record<string, unknown>;
    const col = t[this.primaryKey];
    const rows = await (this.db().select() as { from: (t: AnyTable) => { where: (c: unknown) => { limit: (n: number) => Promise<unknown[]> } } })
      .from(this.table)
      .where(eq(col as never, id as never))
      .limit(1);
    if (rows.length === 0) return null;
    return this.hydrate(rows[0] as Record<string, unknown>);
  }

  static async findOrFail<M extends typeof Model>(this: M, id: number | string): Promise<InstanceType<M>> {
    const inst = await this.find(id);
    if (!inst) throw new NotFoundException(`${this.name} #${id} not found`);
    return inst;
  }

  static async all<M extends typeof Model>(this: M): Promise<InstanceType<M>[]> {
    const rows = await this.db().select().from(this.table);
    return (rows as Record<string, unknown>[]).map((r) => this.hydrate(r));
  }

  static async create<M extends typeof Model>(this: M, data: Record<string, unknown>): Promise<InstanceType<M>> {
    const rows = await this.db().insert(this.table).values(data).returning();
    return this.hydrate((rows as Record<string, unknown>[])[0]!);
  }

  static query<M extends typeof Model>(this: M): QueryBuilder<M> {
    return new QueryBuilder<M>(this);
  }

  static hydrate<M extends typeof Model>(this: M, row: Record<string, unknown>): InstanceType<M> {
    const Ctor = this as unknown as new () => InstanceType<M>;
    const inst = new Ctor();
    (inst as Record<symbol, unknown>)[ATTRS] = { ...row };
    Object.assign(inst as object, row);
    return inst;
  }

  async save(): Promise<this> {
    const ctor = this.constructor as typeof Model;
    const t = ctor.table as unknown as Record<string, unknown>;
    const pk = ctor.primaryKey;
    const id = this[pk];
    const attrs = this.dirtyAttributes();
    if (id === undefined || id === null) {
      const rows = await ctor.db().insert(ctor.table).values(attrs).returning();
      Object.assign(this, (rows as Record<string, unknown>[])[0]);
    } else {
      await ctor.db().update(ctor.table).set(attrs).where(eq(t[pk] as never, id as never));
    }
    return this;
  }

  async delete(): Promise<void> {
    const ctor = this.constructor as typeof Model;
    const t = ctor.table as unknown as Record<string, unknown>;
    const pk = ctor.primaryKey;
    const id = this[pk];
    if (id === undefined || id === null) throw new Error('Cannot delete unsaved model');
    await ctor.db().delete(ctor.table).where(eq(t[pk] as never, id as never));
  }

  hasMany<R extends typeof Model>(related: R, foreignKey: string, localKey?: string): HasMany<R> {
    const ctor = this.constructor as typeof Model;
    return new HasMany<R>(this, related, foreignKey, localKey ?? ctor.primaryKey);
  }

  hasOne<R extends typeof Model>(related: R, foreignKey: string, localKey?: string): HasOne<R> {
    const ctor = this.constructor as typeof Model;
    return new HasOne<R>(this, related, foreignKey, localKey ?? ctor.primaryKey);
  }

  belongsTo<R extends typeof Model>(related: R, foreignKey: string, ownerKey?: string): BelongsTo<R> {
    return new BelongsTo<R>(this, related, foreignKey, ownerKey ?? related.primaryKey);
  }

  toJSON(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(this)) {
      if (k.startsWith('_')) continue;
      const v = this[k];
      if (typeof v === 'function') continue;
      out[k] = v;
    }
    return out;
  }

  private dirtyAttributes(): Record<string, unknown> {
    const ctor = this.constructor as typeof Model;
    const pk = ctor.primaryKey;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(this)) {
      if (k === pk || k.startsWith('_')) continue;
      const v = this[k];
      if (typeof v === 'function') continue;
      out[k] = v;
    }
    return out;
  }
}
