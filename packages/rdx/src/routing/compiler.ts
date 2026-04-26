import type { RequestHandler } from 'express';
import type { Container } from '../container/container.js';
import { HttpKernel } from '../http/kernel.js';
import { Request } from '../http/request.js';
import { Response } from '../http/response.js';
import { toExpressHandler, toRequest, toResponse, type Middleware, type MiddlewareClass } from '../http/middleware.js';
import type { RouteDef } from './route-definition.js';
import type { Router } from './router.js';

const SCOPE_KEY = Symbol.for('rdx.scope');

export class RouteCompiler {
  constructor(private readonly container: Container) {}

  compile(routes: RouteDef[], kernel: HttpKernel): void {
    for (const def of routes) {
      const expressPath = toExpressPath(def.path);
      const handlers: RequestHandler[] = def.middleware.map((mw) =>
        toExpressHandler(mw, (cls) =>
          this.container.resolve<Middleware>(cls as unknown as MiddlewareClass),
        ),
      );
      handlers.push(this.makeActionHandler(def));
      const method = def.method.toLowerCase() as Lowercase<typeof def.method>;
      (kernel.express as unknown as Record<string, (path: string, ...h: RequestHandler[]) => unknown>)[method](
        expressPath,
        ...handlers,
      );
    }
  }

  private makeActionHandler(def: RouteDef): RequestHandler {
    return async (req, res, next) => {
      try {
        const wrappedReq = toRequest(req);
        const wrappedRes = toResponse(res);

        const scope = this.requestScope(req, wrappedReq, wrappedRes);

        await this.applyBindings(req as unknown as { params: Record<string, string>; _bindings?: Record<string, unknown> });

        let result: unknown;
        if (Array.isArray(def.handler)) {
          const [Ctrl, action] = def.handler;
          const inst = scope.resolve(Ctrl) as Record<string, (req: Request, res: Response) => unknown | Promise<unknown>>;
          if (typeof inst[action] !== 'function') {
            throw new Error(`Controller ${Ctrl.name} has no action "${action}"`);
          }
          result = await inst[action]!(wrappedReq, wrappedRes);
        } else {
          const fn = def.handler as (req: Request, res: Response) => unknown | Promise<unknown>;
          result = await fn(wrappedReq, wrappedRes);
        }

        if (result !== undefined && !res.headersSent) {
          res.json(result);
        }
      } catch (e) {
        next(e);
      }
    };
  }

  private async applyBindings(req: { params: Record<string, string>; _bindings?: Record<string, unknown> }): Promise<void> {
    if (!this.container.has('router')) return;
    const router = this.container.resolve<Router>('router');
    if (router.bindings.size === 0) return;
    const out: Record<string, unknown> = req._bindings ?? {};
    for (const [name, resolver] of router.bindings) {
      const raw = req.params[name];
      if (raw === undefined) continue;
      out[name] = await resolver(raw);
    }
    req._bindings = out;
  }

  private requestScope(rawReq: unknown, wrappedReq: Request, wrappedRes: Response): Container {
    const holder = rawReq as { [SCOPE_KEY]?: Container };
    if (holder[SCOPE_KEY]) return holder[SCOPE_KEY];

    const scope = this.container.createScope();
    scope.instance('request', wrappedReq);
    scope.instance('response', wrappedRes);
    scope.instance(Request, wrappedReq);
    scope.instance(Response, wrappedRes);

    holder[SCOPE_KEY] = scope;
    return scope;
  }
}

function toExpressPath(path: string): string {
  return path.replace(/\{(\w+)(\??)\}/g, (_m, name, opt) => `:${name}${opt}`);
}
