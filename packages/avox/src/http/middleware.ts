import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { Request } from './request.js';
import { Response } from './response.js';

export type Next = (err?: unknown) => void;

export interface Middleware {
  handle(req: Request, res: Response, next: Next): unknown | Promise<unknown>;
}

export type MiddlewareFn = (req: Request, res: Response, next: Next) => unknown | Promise<unknown>;

export type MiddlewareClass = new (...args: any[]) => Middleware;

export type FastifyHookFn =
  | preHandlerAsyncHookHandler
  | ((req: FastifyRequest, reply: FastifyReply) => unknown | Promise<unknown>);

export type MiddlewareLike = MiddlewareClass | Middleware | MiddlewareFn | FastifyHookFn;

const MIDDLEWARE_MARK = Symbol.for('avor.middleware');

export function defineMiddleware(fn: MiddlewareFn): preHandlerAsyncHookHandler {
  const wrapped: preHandlerAsyncHookHandler = async (req, reply) => {
    await runWithNextStyle((next) => fn(toRequest(req), toResponse(reply), next));
  };
  (wrapped as unknown as { [MIDDLEWARE_MARK]: true })[MIDDLEWARE_MARK] = true;
  return wrapped;
}

export function isClassMiddleware(m: unknown): m is MiddlewareClass {
  return typeof m === 'function' && (m as { prototype?: { handle?: unknown } }).prototype?.handle !== undefined;
}

export function toFastifyHandler(
  mw: MiddlewareLike,
  resolveInstance: (cls: MiddlewareClass) => Middleware,
): preHandlerAsyncHookHandler {
  if (isClassMiddleware(mw)) {
    const cls = mw;
    return async (req, reply) => {
      const inst = resolveInstance(cls);
      await runWithNextStyle((next) => inst.handle(toRequest(req), toResponse(reply), next));
    };
  }

  if (typeof mw === 'object' && mw !== null && 'handle' in mw && typeof (mw as Middleware).handle === 'function') {
    const inst = mw as Middleware;
    return async (req, reply) => {
      await runWithNextStyle((next) => inst.handle(toRequest(req), toResponse(reply), next));
    };
  }

  if (typeof mw === 'function') {
    const fn = mw as ((req: FastifyRequest, reply: FastifyReply, next?: Next) => unknown | Promise<unknown>);
    return async (req, reply) => {
      const arity = fn.length;
      if (arity >= 3) {
        await runWithNextStyle((next) =>
          fn(toRequest(req) as unknown as FastifyRequest, toResponse(reply) as unknown as FastifyReply, next),
        );
      } else {
        await fn(req, reply);
      }
    };
  }

  throw new Error('Unsupported middleware type');
}

async function runWithNextStyle(call: (next: Next) => unknown | Promise<unknown>): Promise<void> {
  let nextCalled = false;
  let nextErr: unknown = null;
  let nextResolve!: () => void;
  let nextReject!: (err: unknown) => void;
  const nextPromise = new Promise<void>((resolve, reject) => {
    nextResolve = resolve;
    nextReject = reject;
  });
  nextPromise.catch(() => { /* observed via nextErr */ });
  const next: Next = (err?: unknown) => {
    if (nextCalled) return;
    nextCalled = true;
    if (err) {
      nextErr = err;
      nextReject(err);
    } else {
      nextResolve();
    }
  };
  const result = call(next);
  if (result instanceof Promise) {
    try {
      await result;
    } catch (e) {
      throw e;
    }
    if (!nextCalled) return;
    if (nextErr) throw nextErr;
    return;
  }
  await nextPromise;
}

const REQUEST_KEY = Symbol.for('avor.request');
const RESPONSE_KEY = Symbol.for('avor.response');

export function toRequest(raw: FastifyRequest): Request {
  const cached = (raw as unknown as { [REQUEST_KEY]?: Request })[REQUEST_KEY];
  if (cached) return cached;
  const r = new Request(raw);
  (raw as unknown as { [REQUEST_KEY]: Request })[REQUEST_KEY] = r;
  return r;
}

export function toResponse(raw: FastifyReply): Response {
  const cached = (raw as unknown as { [RESPONSE_KEY]?: Response })[RESPONSE_KEY];
  if (cached) return cached;
  const r = new Response(raw);
  (raw as unknown as { [RESPONSE_KEY]: Response })[RESPONSE_KEY] = r;
  return r;
}
