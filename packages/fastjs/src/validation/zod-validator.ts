import type { ZodSchema, ZodIssue } from 'zod';
import type { Middleware, Next } from '../http/middleware.js';
import type { Request } from '../http/request.js';
import type { Response } from '../http/response.js';
import { ValidationException } from '../exceptions/http-exception.js';

export function zodErrorsToMap(issues: ZodIssue[]): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const i of issues) {
    const key = i.path.length ? i.path.join('.') : '_';
    (errors[key] ??= []).push(i.message);
  }
  return errors;
}

export function validate<T>(schema: ZodSchema<T>): Middleware {
  return {
    handle(req: Request, _res: Response, next: Next) {
      const result = schema.safeParse(req.all());
      if (!result.success) {
        next(new ValidationException(zodErrorsToMap(result.error.issues)));
        return;
      }
      (req.raw as unknown as Record<string, unknown>)._validated = result.data;
      next();
    },
  };
}
