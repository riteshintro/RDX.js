# avox

A Laravel-style framework for Node.js, built on **Fastify 5** + **Drizzle ORM** + **TypeScript ESM**.

[![ci](https://github.com/riteshintro/RDX.js/actions/workflows/ci.yml/badge.svg)](https://github.com/riteshintro/RDX.js/actions/workflows/ci.yml)
[![npm avor](https://img.shields.io/npm/v/avox?label=avox)](https://www.npmjs.com/package/avox)
[![npm avor-cli](https://img.shields.io/npm/v/@avoxjs/cli?label=%40avoxjs%2Fcli)](https://www.npmjs.com/package/@avoxjs/cli)
[![npm create-avox-app](https://img.shields.io/npm/v/create-avox-app?label=create-avox-app)](https://www.npmjs.com/package/create-avox-app)
[![license](https://img.shields.io/npm/l/avox)](LICENSE)

It gives Laravel's developer ergonomics (service container, providers, route facade, Active Record on top of an ORM, artisan-style CLI, scheduler, mail) without leaving the Node ecosystem. Targets JSON APIs.

> **Status:** Phases 1–9, 11, 12 shipped. **70 tests** in framework, **15** in CLI, **4** in scaffolder. Auth (better-auth), scheduler (croner), mail (nodemailer + handlebars), and email-driven auth flows are wired and green.

---

## Quick start

```bash
npm create avox-app@latest my-api
cd my-api
pnpm install
cp .env.example .env       # set DATABASE_URL + BETTER_AUTH_SECRET
pnpm avox serve             # → http://127.0.0.1:8000
```

## Install in an existing project

```bash
pnpm add avox
pnpm add -D @avoxjs/cli tsx drizzle-kit
```

Generators:

```bash
pnpm avox make:controller User
pnpm avox make:model       User
pnpm avox make:middleware  RequireAuth
pnpm avox make:migration   create_users_table
pnpm avox make:auth                  # scaffolds better-auth schema + RequireAuth re-export
pnpm avox make:mail        Welcome
```

Operational commands:

```bash
pnpm avox serve              # start the Fastify server
pnpm avox route:list         # print the route table
pnpm avox migrate            # apply pending Drizzle migrations
pnpm avox db:seed            # run database/seeders/*
pnpm avox schedule:list      # list registered scheduled tasks
pnpm avox schedule:run       # start the cron scheduler (Ctrl+C to stop)
```

---

## Architecture

A pnpm monorepo with three published packages and one example app:

```
packages/
  avox/               framework runtime
  cli/                  the `avox` binary (commands, generators)
  create-avox-app/       `npm create avox-app` scaffolder
examples/
  blog-api/             dogfood — full-stack avox app
```

**Boot sequence (`Application.boot()`):**

1. `loadEnv()` from `.env` (dotenv)
2. Build the DI container (tsyringe child container per `Application`)
3. Register config (`ConfigRepository`) and logger (pino) instances
4. **Provider register phase** — built-in providers run in order:
   `Http → Routing → Database → Scheduler → Mail → Auth`
   plus any user providers from `withProviders([...])`.
5. **Provider boot phase** — each provider's `boot()` runs sequentially.
   Auth provider mounts the better-auth handler under `/api/auth/*` here.
6. Apply early middleware queued via `app.use(...)`.
7. Run `loadRoutesFrom()` user loader — this is when your `Route.get(...)` calls fire.
8. Compile `Router.routes` into Fastify routes via `RouteCompiler`.
9. Run `loadScheduleFrom()` user loader (cron tasks).
10. (`listen()`) finalize: install 404 + error handlers, then `fastify.ready()`.

User-facing entry is `bootstrap/app.ts`:

```ts
import 'reflect-metadata';
import { Application } from 'avox';

export default async function createApp() {
  return new Application(import.meta.dirname)
    .withConfig({ /* see config sections below */ })
    .loadRoutesFrom(() => import('../routes/api.js'))
    .loadScheduleFrom(() => import('../app/Console/Schedule.js'));
}
```

---

## Features

### Routing

Laravel-style facade with groups, prefixes, named routes, and route model binding.

```ts
import { Route, RequireAuth, type Request } from 'avox';
import { PostController } from '../app/Http/Controllers/PostController.js';

Route.get('/health', () => ({ ok: true }));

Route.group({ prefix: '/api/v1' }, () => {
  Route.get('/posts',          [PostController, 'index']).name('posts.index');
  Route.get('/posts/{id}',     [PostController, 'show']).name('posts.show');
  Route.post('/posts',         [PostController, 'store'])
    .middleware(RequireAuth)
    .name('posts.store');
});

Route.bind('post', async (id) => Post.findOrFail(Number(id)));   // route model binding
Route.url('posts.show', { id: 42 });                             // → '/api/v1/posts/42'
```

Per-route handlers can be either a closure (`(req, res) => ...`) or a `[Controller, 'action']` tuple. Controllers resolve from a per-request DI scope, so constructor `@inject(Request)` works.

### Service container & providers

```ts
import { Container, ServiceProvider } from 'avox';

class CacheServiceProvider extends ServiceProvider {
  override register() {
    this.app.container.singleton('cache', () => new RedisCache(...));
  }
  override async boot() {
    await this.app.container.resolve<RedisCache>('cache').connect();
  }
}

new Application(...).withProviders([CacheServiceProvider]);
```

`Application.container` is a tsyringe child container. `.singleton()`, `.bind()`, `.instance()`, `.createScope()`, `.resolve()` are all wrapped.

### Database — Drizzle + Active Record `Model`

Drizzle owns the schema (in `database/schema/*.ts`). `Model` is an Active Record façade on top.

```ts
// database/schema/users.ts
import { pgTable, serial, text, boolean } from 'drizzle-orm/pg-core';
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  active: boolean('active').default(true).notNull(),
});

// app/Models/User.ts
import { Model } from 'avox/database';
import { usersTable } from '../../database/schema/users.js';
import { Post } from './Post.js';

export class User extends Model {
  static override table = usersTable;
  posts() { return this.hasMany(Post, 'user_id'); }
}

// usage
await User.create({ name: 'Alice' });
const u  = await User.findOrFail(1);
const ps = await u.posts().get();
const xs = await User.query().where(eq(usersTable.active, true)).orderBy(usersTable.id, 'desc').limit(20).get();
```

`Model` provides `find / findOrFail / all / create / query / save / delete / toJSON` plus `hasOne / hasMany / belongsTo` relations. Drop down to raw Drizzle anytime via `Model.db`.

### Validation — Zod

```ts
import { z } from 'zod';
import { Route, validate, FormRequest, type Request } from 'avox';

// Inline middleware
Route.post('/users',
  (req: Request) => req.validated(),
).middleware(validate(z.object({
  name:  z.string().min(2),
  email: z.string().email(),
})));

// Or as a class (FormRequest pattern)
class CreateUserRequest extends FormRequest {
  override rules() {
    return z.object({ name: z.string().min(2), email: z.string().email() });
  }
  override authorize(req: Request) { return req.user() !== null; }
}

Route.post('/users', UserController, 'store').middleware(CreateUserRequest);
```

Failures return `422 { message, errors: { field: [msg] } }` via `ValidationException`.

### Auth — better-auth

`Auth` facade, `RequireAuth` injectable middleware, `AuthServiceProvider` (auto-registered, opt-in via `config.auth.enabled`). Better-auth's Drizzle adapter writes to `user`, `session`, `account`, `verification` tables (schema in `avox/auth`).

```ts
import { Route, RequireAuth, Auth, type Request } from 'avox';

Route.get('/me', async (req: Request) => Auth.user(req)).middleware(RequireAuth);
Route.get('/whoami', async (req: Request) => ({ user: await Auth.user(req) }));
```

Mounted endpoints (under `config.auth.routePrefix`, default `/api/auth`):
- `POST /sign-up/email` — body `{ name, email, password }`
- `POST /sign-in/email` — body `{ email, password }`
- `POST /sign-out`
- `GET  /get-session`
- `POST /verify-email/:token` (when verification enabled)
- `POST /request-password-reset` — body `{ email, redirectTo }`
- `POST /reset-password` — body `{ newPassword, token }`

Better-auth itself accepts plugin extensions (passkeys, OAuth providers, magic-link, 2FA, etc.) via `config.auth.options.extra`.

### Email — nodemailer + handlebars

`Mail` facade with templated `Mailable` classes. Handlebars templates from `resources/mail/*.hbs`, or define inline via `source()`.

```ts
import { Mailable, Mail } from 'avox';

class WelcomeMail extends Mailable<{ name: string; verifyUrl: string }> {
  override subject(p) { return `Welcome ${p.name}!`; }
  override template() { return 'welcome'; }                 // resources/mail/welcome.hbs
  override async data(p) { return { name: p.name, link: p.verifyUrl }; }
  override from() { return 'noreply@example.com'; }
}

await Mail.send(WelcomeMail, 'alice@example.com', { name: 'Alice', verifyUrl: '...' });
await Mail.to(['ops@x.com', 'admin@x.com']).send(AlertMail, { ... });
```

Transports: `smtp`, `json` (dev/tests — `mailer.sentMessages` records), `stream`, `sendmail`.

**Auth ⇄ mail integration.** When `Mailer` is bound (it is by default) and `config.auth.enabled = true`, the `AuthServiceProvider` wires better-auth's `sendVerificationEmail` and `sendResetPassword` callbacks through `Mail` automatically using the built-in `VerifyEmailMail` and `ResetPasswordMail` mailables (both exported from `avox`). Override them by passing your own mailables through `config.auth.options.extra`.

```ts
auth: {
  enabled: true,
  email: {
    requireVerification: true,    // block sign-in until verified
    sendOnSignUp:        true,    // fire VerifyEmailMail on /sign-up/email
    appName:             'My App',
  },
}
```

### Scheduler — croner

```ts
// app/Console/Schedule.ts
import { Schedule } from 'avox';

export default async function (app) {
  Schedule.everyFiveMinutes(() => CleanupTempFiles.run(),     { name: 'temp-cleanup' });
  Schedule.dailyAt('14:30',   () => Reports.daily(),          { name: 'daily-report' });
  Schedule.cron('0 */2 * * *', () => SyncJob.run(),           { name: 'sync',  timezone: 'UTC' });
}
```

Then `pnpm avox schedule:run` boots the app, registers tasks, and starts crons (Ctrl+C to stop). `pnpm avox schedule:list` prints a table without starting.

Helpers: `everyMinute / everyFiveMinutes / hourly / daily / dailyAt('HH:MM') / weekly / monthly`. Plus `Schedule.cron(expr, fn, opts?)` for full control. Built on [croner](https://github.com/Hexagon/croner) — overlap protection, timezone, paused-by-default options, all there.

### File uploads — `@fastify/multipart`

```ts
import { Route, Upload, type Request } from 'avox';

Route.post('/avatar', (req: Request) => {
  const f = req.file('avatar');           // RdxUploadedFile | undefined
  return { name: f?.originalname, bytes: f?.size };
}).middleware(Upload.single('avatar'));

Route.post('/photos', (req: Request) => ({
  count: req.files('photos').length,
})).middleware(Upload.array('photos', 5));

Route.post('/profile', handler).middleware(Upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'cover',  maxCount: 5 },
]));
```

`@fastify/multipart` is auto-registered by HttpKernel. Configure limits via `config.http.multipart`.

### Migrations & seeders

`make:migration` delegates to `drizzle-kit generate` (you supply `drizzle.config.ts`). `migrate` runs migrations programmatically against the configured driver (`pg` or `pglite` for tests). `db:seed` discovers `database/seeders/*.{ts,mts,js,mjs}` files in alphabetical order; each must default-export `(db, app) => Promise<void>`.

```bash
pnpm avox make:migration init_users
pnpm avox migrate
pnpm avox db:seed
pnpm avox db:seed --only 02-bonus
```

### Configuration

`Application.withConfig({ ... })` accepts a tree resolved by `config('dot.path', default?)`. Default keys:

| Key                                    | Description                                                         |
|----------------------------------------|---------------------------------------------------------------------|
| `app.name / .env / .port / .host`      | App identity + listen settings                                      |
| `logging.level`                        | pino level (`trace`/`debug`/`info`/`warn`/`error`/`fatal`/`silent`) |
| `database.url`                         | Postgres connection string (or `DATABASE_URL`)                      |
| `database.driver`                      | `pg` (default) or `pglite` (tests)                                  |
| `database.migrationsFolder`            | Default: `database/migrations`                                      |
| `database.seedersFolder`               | Default: `database/seeders`                                         |
| `http.bodyLimit`                       | Bytes (default 1 MB)                                                |
| `http.trustProxy`                      | passed to Fastify                                                   |
| `http.exceptionRenderer`               | Replace default error renderer                                      |
| `http.multipart.{fileSize,files,fields,enabled}` | `@fastify/multipart` limits                               |
| `auth.enabled`                         | Mount better-auth (default `false`)                                 |
| `auth.routePrefix`                     | Default `/api/auth`                                                 |
| `auth.email.{requireVerification,sendOnSignUp,appName}` | Mail-driven auth flows                             |
| `auth.options`                         | Pass-through to better-auth                                         |
| `mail.transport`                       | `smtp` / `json` / `stream` / `sendmail`                             |
| `mail.{host,port,secure,auth,from}`    | SMTP settings                                                       |
| `mail.templatesPath`                   | Default `resources/mail`                                            |

Full `.env.example` lives in `examples/blog-api/` and the `create-avox-app` template.

---

## Repo layout

```
avox framework/
├── packages/
│   ├── avox/                                         framework runtime
│   │   └── src/
│   │       ├── application.ts                        Application class — boot orchestrator
│   │       ├── container/                            tsyringe wrapper
│   │       ├── config/                               ConfigRepository
│   │       ├── http/                                 Fastify kernel, Request/Response wrappers, middleware adapter, exception handler
│   │       ├── routing/                              Route facade, Router, RouteCompiler
│   │       ├── database/                             Model, QueryBuilder, relations, connection
│   │       ├── validation/                           Zod validate(), FormRequest
│   │       ├── auth/                                 createAuth, Auth facade, RequireAuth, schema, mailables
│   │       ├── scheduler/                            Scheduler, Schedule facade
│   │       ├── mail/                                 Mailer, Mailable, Mail facade
│   │       ├── uploads/                              Upload (single/array/fields/any) — @fastify/multipart
│   │       ├── exceptions/                           HttpException tree
│   │       ├── providers/                            Built-in service providers
│   │       └── support/                              env(), config(), app(), logger() helpers
│   ├── cli/                                          `avox` binary
│   │   └── src/commands/                             serve, route:list, make:*, migrate, db:seed, schedule:*
│   └── create-avox-app/                               `npm create avox-app` scaffolder + default template
└── examples/
    └── blog-api/                                     dogfood app
```

---

## Testing

`pnpm -r test` runs everything. Each package uses **vitest**. Database tests use **pglite** (in-memory Postgres-compatible) via `drizzle-orm/pglite`, so the suite runs offline with no Docker.

```bash
pnpm install
pnpm -r build            # avor must be built before CLI tests run, since CLI fixtures resolve `from "avox"` against dist/
pnpm -r test
```

Current counts:

```
packages/avox              70 tests across 10 files
packages/cli              15 tests across  5 files
packages/create-avox-app    4 tests
                       —  89 total
```

Test fixtures live in `packages/cli/tests/fixtures/`. They're real bootstrap apps (one per scenario) that the CLI loads via `tsx tsImport` against `bootstrap/app.mts`.

---

## Tech choices

| Concern             | Choice                            | Why                                                             |
|---------------------|-----------------------------------|-----------------------------------------------------------------|
| HTTP                | Fastify 5                         | Schema-first, hooks, ~3× perf vs Express; native async errors   |
| ORM                 | Drizzle 0.45                      | Schema-first TS, no decorators, raw SQL escape hatch first-class |
| DB driver           | `pg` (prod), `@electric-sql/pglite` (tests) | Real Postgres in-process for tests                  |
| DI                  | tsyringe + `reflect-metadata`     | Decorator-friendly, child containers for per-request scope      |
| Validation          | Zod 4                             | TS-first; matches Drizzle ethos; better-auth peer requires v4   |
| Auth                | better-auth 1.6 + Drizzle adapter | Sessions/JWT/OAuth/2FA + plugin ecosystem out of the box        |
| Mail                | nodemailer + handlebars           | Boring + mature                                                 |
| Scheduler           | croner                            | Zero-dep, validates expressions at construction                 |
| CLI                 | cac                               | Tiny, simple, good TS inference                                 |
| Logger              | pino                              | Fast structured logger; pretty in dev                           |
| Bundler             | tsup                              | Fast, declaration-emit, ESM-only                                |
| Test runner         | vitest                            | Native ESM, parallel-aware, supertest-friendly                  |

---

## Roadmap

| #   | Feature                                  | Status                                          |
|-----|------------------------------------------|-------------------------------------------------|
| 1–8 | Foundation, HTTP, Routing, CLI, DB/Model, Validation, Migrations, Scaffolder | ✅ shipped |
| 9   | **Auth (better-auth)**                   | ✅ shipped                                      |
| 10  | **Queues (BullMQ)**                      | scheduled remote agent — fires 2026-05-10 UTC   |
| 11  | **Scheduler (cron)**                     | ✅ shipped                                      |
| 12  | **Mail (nodemailer + handlebars)**       | ✅ shipped, integrated with auth                |
| 13  | **File storage (Local + S3)**            | scheduled remote agent — fires 2026-05-17 UTC   |

Future candidates: rate limiting (`@fastify/rate-limit` wrapper), broadcasting (WebSocket pubsub), policy/gate authorization (currently per-route via FormRequest.authorize and middleware).

---

## License

MIT.
