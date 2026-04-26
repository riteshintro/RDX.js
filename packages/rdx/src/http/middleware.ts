import type { NextFunction, Request as ExpressRequest, Response as ExpressResponse, RequestHandler } from 'express';
import { Request } from './request.js';
import { Response } from './response.js';

export interface Middleware {
  handle(req: Request, res: Response, next: NextFunction): unknown | Promise<unknown>;
}

export type MiddlewareFn = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

export type MiddlewareClass = new (...args: any[]) => Middleware;

export type MiddlewareLike = MiddlewareClass | Middleware | MiddlewareFn | RequestHandler;

const MIDDLEWARE_MARK = Symbol.for('rdx.middleware');

export function defineMiddleware(fn: MiddlewareFn): RequestHandler {
  const wrapped: RequestHandler = (req, res, next) => {
    return Promise.resolve(fn(toRequest(req), toResponse(res), next)).catch(next);
  };
  (wrapped as unknown as { [MIDDLEWARE_MARK]: true })[MIDDLEWARE_MARK] = true;
  return wrapped;
}

export function isClassMiddleware(m: unknown): m is MiddlewareClass {
  return typeof m === 'function' && (m as { prototype?: { handle?: unknown } }).prototype?.handle !== undefined;
}

export function toExpressHandler(mw: MiddlewareLike, resolveInstance: (cls: MiddlewareClass) => Middleware): RequestHandler {
  if (isClassMiddleware(mw)) {
    const cls = mw;
    return (req, res, next) => {
      const inst = resolveInstance(cls);
      return Promise.resolve(inst.handle(toRequest(req), toResponse(res), next)).catch(next);
    };
  }
  if (typeof mw === 'object' && mw !== null && 'handle' in mw && typeof (mw as Middleware).handle === 'function') {
    const inst = mw as Middleware;
    return (req, res, next) => {
      return Promise.resolve(inst.handle(toRequest(req), toResponse(res), next)).catch(next);
    };
  }
  return mw as RequestHandler;
}

const REQUEST_KEY = Symbol.for('rdx.request');
const RESPONSE_KEY = Symbol.for('rdx.response');

export function toRequest(raw: ExpressRequest): Request {
  const cached = (raw as unknown as { [REQUEST_KEY]?: Request })[REQUEST_KEY];
  if (cached) return cached;
  const r = new Request(raw);
  (raw as unknown as { [REQUEST_KEY]: Request })[REQUEST_KEY] = r;
  return r;
}

export function toResponse(raw: ExpressResponse): Response {
  const cached = (raw as unknown as { [RESPONSE_KEY]?: Response })[RESPONSE_KEY];
  if (cached) return cached;
  const r = new Response(raw);
  (raw as unknown as { [RESPONSE_KEY]: Response })[RESPONSE_KEY] = r;
  return r;
}
