---
"@fyron/core": minor
"@fyron/cli": patch
"create-fyron-app": patch
---

Add `withFastify`, `withProvidersBefore/After`, `Application.reset()`, and fix version baking in scaffolder.

**@fyron/core (minor)**
- `Application.withFastify(fn)` — register Fastify plugins before routes compile; callbacks run after all providers boot, at the correct lifecycle point
- `Application.withProvidersBefore(Target, providers)` — insert custom providers immediately before a built-in provider in the boot order
- `Application.withProvidersAfter(Target, providers)` — insert custom providers immediately after a built-in provider
- `Application.reset()` — static method for test teardown; clears the process-level singleton
- Provider `register()` and `boot()` errors now include the provider class name in the thrown message
- Fix log messages: `'avor booted'` → `'fyron booted'`, `'avor server listening'` → `'fyron server listening'`
- Export `FastifyInstance`, `FastifyRequest`, `FastifyReply` types from `@fyron/core/http` sub-path

**create-fyron-app (patch)**
- Version for `@fyron/core` and `@fyron/cli` dependencies is now baked at build time via `tsup define`, preventing `^0.0.1` not-found errors in scaffolded projects
- Fix `drizzle-kit` version in template (`^0.45.0` to match `drizzle-orm ^0.45.2`)
- Add `handlebars` to template dependencies
