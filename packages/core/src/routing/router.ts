import type { MiddlewareLike } from '../http/middleware.js';
import type { GroupAttributes, HttpMethod, RouteDef, RouteHandler } from './route-definition.js';

export type Binder = (id: string) => unknown | Promise<unknown>;

export class Router {
  readonly routes: RouteDef[] = [];
  readonly bindings = new Map<string, Binder>();
  private readonly groupStack: GroupAttributes[] = [];
  private readonly nameIndex = new Map<string, RouteDef>();

  bind(name: string, resolver: Binder): this {
    this.bindings.set(name, resolver);
    return this;
  }

  add(method: HttpMethod, path: string, handler: RouteHandler): RouteBuilder {
    const merged = this.merged();
    const def: RouteDef = {
      method,
      path: joinPath(merged.prefix, path),
      handler,
      middleware: [...(merged.middleware ?? [])],
      name: undefined,
    };
    this.routes.push(def);
    return new RouteBuilder(def, merged.name ?? '', this.nameIndex);
  }

  group(attrs: GroupAttributes, fn: () => void): void {
    this.groupStack.push(attrs);
    try {
      fn();
    } finally {
      this.groupStack.pop();
    }
  }

  named(name: string): RouteDef | undefined {
    return this.nameIndex.get(name);
  }

  url(name: string, params: Record<string, string | number> = {}): string {
    const def = this.nameIndex.get(name);
    if (!def) throw new Error(`Route [${name}] not defined.`);
    let path = def.path;
    for (const [k, v] of Object.entries(params)) {
      path = path.replace(new RegExp(`\\{${k}\\??\\}`, 'g'), String(v));
    }
    return path;
  }

  private merged(): GroupAttributes {
    const out: GroupAttributes = { prefix: '', middleware: [], name: '' };
    for (const g of this.groupStack) {
      if (g.prefix) out.prefix = joinPath(out.prefix, g.prefix);
      if (g.middleware) out.middleware = [...(out.middleware ?? []), ...g.middleware];
      if (g.name) out.name = (out.name ?? '') + g.name;
    }
    return out;
  }
}

export class RouteBuilder {
  constructor(
    private readonly def: RouteDef,
    private readonly namePrefix: string,
    private readonly nameIndex: Map<string, RouteDef>,
  ) {}

  middleware(...mw: MiddlewareLike[]): this {
    this.def.middleware.push(...mw);
    return this;
  }

  name(n: string): this {
    const full = this.namePrefix + n;
    if (this.nameIndex.has(full)) {
      throw new Error(`Route name [${full}] already defined.`);
    }
    this.def.name = full;
    this.nameIndex.set(full, this.def);
    return this;
  }
}

function joinPath(a: string | undefined, b: string): string {
  const left = (a ?? '').replace(/\/+$/, '');
  const right = b.startsWith('/') ? b : `/${b}`;
  const out = left + right;
  return out || '/';
}
