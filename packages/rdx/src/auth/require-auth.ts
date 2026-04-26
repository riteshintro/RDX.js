import { injectable } from 'tsyringe';
import type { NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { Application } from '../application.js';
import type { Middleware } from '../http/middleware.js';
import type { Request } from '../http/request.js';
import type { Response } from '../http/response.js';
import { UnauthorizedException } from '../exceptions/http-exception.js';

@injectable()
export class RequireAuth implements Middleware {
  async handle(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = Application.current().auth();
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.raw.headers) });
      if (!session) {
        next(new UnauthorizedException());
        return;
      }
      const raw = req.raw as unknown as Record<string, unknown>;
      raw._user = session.user;
      raw._session = session.session;
      next();
    } catch (e) {
      next(e);
    }
  }
}
