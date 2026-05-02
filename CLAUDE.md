# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Fyron is a Laravel-inspired Node.js framework on Fastify 5, Drizzle ORM, and TypeScript ESM. Three published packages live in a pnpm + Turborepo monorepo:

- `@fyron/core` — runtime (HTTP, DI, routing, DB, auth, mail, scheduler, uploads)
- `@fyron/cli` — artisan-style CLI (12 commands; depends on `@fyron/core`)
- `create-fyron-app` — project scaffolder

`examples/blog-api` is a dogfood app; `docs/` is a Fumadocs (Next.js) site.

## Commands

All run from the monorepo root unless noted.

```bash
# Build all packages (respects dependency order: core → cli)
pnpm build

# Run all tests
pnpm test

# Type-check all packages
pnpm typecheck

# Lint + format check (biome check per package, cached by turbo)
pnpm lint

# Fix formatting
pnpm format

# Watch mode (all packages)
pnpm dev

# Drop all dist/ artifacts
pnpm clean

# Single package
pnpm --filter @fyron/core build
pnpm --filter @fyron/core test
pnpm --filter @fyron/cli test

# Single test file
pnpm --filter @fyron/core exec vitest run src/__tests__/routing.test.ts

# blog-api example (from examples/blog-api/)
pnpm fyron serve
pnpm fyron route:list
pnpm fyron migrate
```

## Tooling

| Tool | Purpose |
|------|---------|
| **Turborepo** | Task orchestration — `build` has `dependsOn: ["^build"]`, guaranteeing core compiles before cli |
| **tsup** | Bundler — `@fyron/core` builds 12 named entry points; `@fyron/cli` builds a single shebang binary |
| **Biome** | Lint + format — `biome check src` per package (both in one pass). Config in `biome.json` at root |
| **Changesets** | Release management — `pnpm changeset` → version PR → `pnpm release` publishes all three packages together (they are `fixed` in `.changeset/config.json`) |
| **pglite** | In-process Postgres for tests — no external database needed |

Core vitest runs `fileParallelism: false, pool: 'forks', singleFork: true` — all tests execute sequentially in one process because they share a pglite database.

## Boot Lifecycle

`Application.boot()` steps, in order:

1. `loadEnv()` — dotenv
2. `ConfigRepository` + `Logger` registered into container
3. **All providers `register()`** — binding factories, no resolution between providers yet
4. **All providers `boot()`** — safe to resolve other services here
5. `app.use()` early middleware applied to Fastify
6. **`app.withFastify()` callbacks** — register Fastify plugins here, before routes
7. Route loader runs → `Route.*` calls populate the `Router`
8. `RouteCompiler.compile()` → converts `Router` entries into Fastify route handlers
9. Schedule loader runs
10. `booted = true`, log `"fyron booted"`

Built-in provider order: `Http → Routing → Database → Scheduler → Mail → Auth`, then user providers. Use `withProvidersBefore(Target, [...])` / `withProvidersAfter(Target, [...])` to insert between built-ins.

## Key Architectural Patterns

### Application singleton

`Application.current()` is a process-level global accessed by all facades. Only one `Application` instance should exist at a time. In tests always call `Application.reset()` in `afterEach` to prevent state bleed.

### Facade → container resolution

`Route`, `Auth`, `Mail`, `Schedule`, `Model.db()` all call `Application.current()` then resolve from its container. They can only be called after `boot()` completes (or inside a provider's `boot()` method). Calling them at module load time will throw.

### DI container tokens

`Container` wraps tsyringe. Services are registered with either a string token (`'db'`, `'httpKernel'`, `'router'`) or the class constructor itself. String tokens are used when multiple packages need to share a reference without importing the concrete class.

```ts
// Register
this.app.container.singleton(HttpKernel, (c) => new HttpKernel(...));
this.app.container.bind('httpKernel', (c) => c.resolve(HttpKernel));

// Resolve
const kernel = this.app.container.resolve<HttpKernel>('httpKernel');
```

### Sub-path imports

`@fyron/core` has 12 named export points (`@fyron/core`, `@fyron/core/routing`, `@fyron/core/database`, etc.). Import from the sub-path that matches the module to avoid pulling the entire runtime into a bundle. `reflect-metadata` is imported automatically by `@fyron/core/container` and the root `@fyron/core` barrel — other sub-paths do not guarantee it.

### Adding a Fastify plugin

```ts
// bootstrap/app.ts
app.withFastify(async (fastify) => {
  await fastify.register(fastifyCors, { origin: true });
});
```

Do not call `fastify.register()` from inside a service provider's `register()` — Fastify plugins must be registered before the instance is finalized, and `withFastify` callbacks run at the correct point in the boot sequence.

### Writing a service provider

```ts
export class MyProvider extends ServiceProvider {
  register(): void {
    // bind factories — no resolution of other services here
    this.app.container.singleton('myService', () => new MyService());
  }
  async boot(): Promise<void> {
    // safe to resolve; all register() calls have completed
    const svc = this.app.container.resolve<MyService>('myService');
    await svc.connect();
    this.app.onShutdown(() => svc.disconnect());
  }
}
```

Register via `app.withProviders([MyProvider])` or inject at a specific position with `withProvidersBefore` / `withProvidersAfter`.

## TypeScript Notes

- `noUnusedLocals: true` and `noUnusedParameters: true` are enforced — unused variables are compile errors.
- `experimentalDecorators` and `emitDecoratorMetadata` are enabled — required for tsyringe.
- `useDefineForClassFields: false` — required for decorator metadata to work correctly with class fields.
- `moduleResolution: "Bundler"` — use `.js` extensions in imports (even for `.ts` source files).

## Known Stale Symbols

Internal symbols in `model.ts` and `middleware.ts` still use the old `'avor.*'` namespace (e.g. `Symbol.for('avor.modelAttrs')`). These are internal only and do not affect the public API.
