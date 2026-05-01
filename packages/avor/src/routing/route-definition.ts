import type { MiddlewareLike } from '../http/middleware.js';
import type { Request } from '../http/request.js';
import type { Response } from '../http/response.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type ControllerCtor = new (...args: any[]) => Record<string, any>;
export type ControllerAction = readonly [ControllerCtor, string];
export type RouteHandlerFn = (req: Request, res: Response) => unknown | Promise<unknown>;
export type RouteHandler = ControllerAction | RouteHandlerFn;

export interface RouteDef {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  middleware: MiddlewareLike[];
  name: string | undefined;
}

export interface GroupAttributes {
  prefix?: string;
  middleware?: MiddlewareLike[];
  name?: string;
}
