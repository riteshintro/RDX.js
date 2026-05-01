import type { ZodSchema } from 'zod';
import type { Middleware, Next } from '../http/middleware.js';
import type { Request } from '../http/request.js';
import type { Response } from '../http/response.js';
import { ValidationException, ForbiddenException } from '../exceptions/http-exception.js';
import { zodErrorsToMap } from './zod-validator.js';

export abstract class FormRequest implements Middleware {
  abstract rules(req: Request): ZodSchema;
  authorize(_req: Request): boolean { return true; }

  handle(req: Request, _res: Response, next: Next): void {
    if (!this.authorize(req)) {
      next(new ForbiddenException());
      return;
    }
    const result = this.rules(req).safeParse(req.all());
    if (!result.success) {
      next(new ValidationException(zodErrorsToMap(result.error.issues)));
      return;
    }
    (req.raw as unknown as Record<string, unknown>)._validated = result.data;
    next();
  }
}
