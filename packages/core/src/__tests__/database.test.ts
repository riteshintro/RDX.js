import { describe, it, expect, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pgTable, serial, text, integer, boolean } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { Application, Model } from '../index.js';

const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  active: boolean('active').default(true).notNull(),
});

const postsTable = pgTable('posts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  title: text('title').notNull(),
});

const profilesTable = pgTable('profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  bio: text('bio'),
});

class User extends Model {
  static override table = usersTable;
  posts() {
    return this.hasMany(Post, 'user_id');
  }
  profile() {
    return this.hasOne(Profile, 'user_id');
  }
}

class Post extends Model {
  static override table = postsTable;
  user() {
    return this.belongsTo(User, 'user_id');
  }
}

class Profile extends Model {
  static override table = profilesTable;
  user() {
    return this.belongsTo(User, 'user_id');
  }
}

async function freshApp(): Promise<Application> {
  const client = new PGlite();
  await client.exec(`
    CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, active BOOLEAN NOT NULL DEFAULT TRUE);
    CREATE TABLE posts (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, title TEXT NOT NULL);
    CREATE TABLE profiles (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, bio TEXT);
  `);
  const db = drizzle(client);

  const a = new Application(process.cwd())
    .withConfig({ logging: { level: 'silent' } })
    .withoutBuiltIn((await import('../providers/database-service-provider.js')).DatabaseServiceProvider);
  await a.boot();
  a.container.instance('db', db as unknown as object);
  return a;
}

let _app: Application;

beforeEach(async () => {
  _app = await freshApp();
});

describe('Model — basic CRUD', () => {
  it('creates a row and returns hydrated instance', async () => {
    const u = await User.create({ name: 'Alice', email: 'a@b.c' });
    expect(u).toBeInstanceOf(User);
    expect(u.id).toBeTypeOf('number');
    expect(u.name).toBe('Alice');
    expect(u.email).toBe('a@b.c');
    expect(u.active).toBe(true);
  });

  it('finds a row by primary key', async () => {
    const a = await User.create({ name: 'Alice' });
    const found = await User.find(a.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Alice');
  });

  it('returns null when find misses', async () => {
    expect(await User.find(99999)).toBeNull();
  });

  it('findOrFail throws when missing', async () => {
    await expect(User.findOrFail(99999)).rejects.toThrow(/User #99999 not found/);
  });

  it('all() returns every row hydrated', async () => {
    await User.create({ name: 'a' });
    await User.create({ name: 'b' });
    const list = await User.all();
    expect(list).toHaveLength(2);
    expect(list.map((u) => u.name).sort()).toEqual(['a', 'b']);
  });

  it('save() updates an existing row', async () => {
    const u = await User.create({ name: 'Alice' });
    u.name = 'Alicia';
    await u.save();
    const re = await User.findOrFail(u.id);
    expect(re.name).toBe('Alicia');
  });

  it('save() inserts when no primary key set', async () => {
    const u = new User();
    u.name = 'Bob';
    u.email = 'b@b.c';
    await u.save();
    expect(u.id).toBeTypeOf('number');
    const re = await User.findOrFail(u.id);
    expect(re.email).toBe('b@b.c');
  });

  it('delete() removes the row', async () => {
    const u = await User.create({ name: 'Temp' });
    await u.delete();
    expect(await User.find(u.id)).toBeNull();
  });

  it('toJSON() omits methods and underscore keys', async () => {
    const u = await User.create({ name: 'Alice', email: 'a@b.c' });
    const json = u.toJSON();
    expect(json).toMatchObject({ name: 'Alice', email: 'a@b.c', active: true });
    expect(typeof (json as any).save).toBe('undefined');
  });
});

describe('Model — query builder', () => {
  beforeEach(async () => {
    await User.create({ name: 'a', active: true });
    await User.create({ name: 'b', active: false });
    await User.create({ name: 'c', active: true });
  });

  it('where + get returns matching rows', async () => {
    const rows = await User.query().where(eq(usersTable.active, true)).get();
    expect(rows).toHaveLength(2);
    expect(rows.map((u) => u.name).sort()).toEqual(['a', 'c']);
  });

  it('first() returns single row or null', async () => {
    const u = await User.query().where(eq(usersTable.name, 'b')).first();
    expect(u?.name).toBe('b');
    expect(await User.query().where(eq(usersTable.name, 'zzz')).first()).toBeNull();
  });

  it('orderBy + limit + offset chain', async () => {
    const rows = await User.query().orderBy(usersTable.name, 'desc').limit(2).get();
    expect(rows.map((u) => u.name)).toEqual(['c', 'b']);
  });

  it('count() returns total matching rows', async () => {
    expect(await User.query().count()).toBe(3);
    expect(await User.query().where(eq(usersTable.active, true)).count()).toBe(2);
  });
});

describe('Model — relations', () => {
  it('hasMany returns child rows', async () => {
    const u = await User.create({ name: 'Author' });
    await Post.create({ user_id: u.id, title: 'one' });
    await Post.create({ user_id: u.id, title: 'two' });
    const posts = await u.posts().get();
    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.title).sort()).toEqual(['one', 'two']);
  });

  it('hasOne returns single child or null', async () => {
    const u = await User.create({ name: 'Author' });
    expect(await u.profile().get()).toBeNull();
    await Profile.create({ user_id: u.id, bio: 'hi' });
    const p = await u.profile().get();
    expect(p?.bio).toBe('hi');
  });

  it('belongsTo returns parent', async () => {
    const u = await User.create({ name: 'Author' });
    const p = await Post.create({ user_id: u.id, title: 'one' });
    const owner = await p.user().get();
    expect(owner?.name).toBe('Author');
  });
});
