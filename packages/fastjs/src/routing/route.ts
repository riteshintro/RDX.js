import { Application } from '../application.js';
import { Router, type RouteBuilder, type Binder } from './router.js';
import type { GroupAttributes, RouteHandler } from './route-definition.js';

function router(): Router {
  return Application.current().router();
}

export const Route = {
  get: (path: string, handler: RouteHandler): RouteBuilder => router().add('GET', path, handler),
  post: (path: string, handler: RouteHandler): RouteBuilder => router().add('POST', path, handler),
  put: (path: string, handler: RouteHandler): RouteBuilder => router().add('PUT', path, handler),
  patch: (path: string, handler: RouteHandler): RouteBuilder => router().add('PATCH', path, handler),
  delete: (path: string, handler: RouteHandler): RouteBuilder => router().add('DELETE', path, handler),
  options: (path: string, handler: RouteHandler): RouteBuilder => router().add('OPTIONS', path, handler),
  head: (path: string, handler: RouteHandler): RouteBuilder => router().add('HEAD', path, handler),
  group: (attrs: GroupAttributes, fn: () => void): void => router().group(attrs, fn),
  url: (name: string, params: Record<string, string | number> = {}): string => router().url(name, params),
  bind: (name: string, resolver: Binder): void => { router().bind(name, resolver); },
} as const;
