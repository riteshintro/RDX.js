import type { ErrorRequestHandler } from 'express';
import type { Logger } from '../logging/logger.js';
import { HttpException, ValidationException } from '../exceptions/http-exception.js';

export interface ExceptionRenderer {
  (err: unknown): { status: number; body: unknown; headers?: Record<string, string> };
}

export const defaultRenderer: ExceptionRenderer = (err) => {
  if (err instanceof ValidationException) {
    return {
      status: err.status,
      headers: err.headers,
      body: { message: err.message, errors: err.errors },
    };
  }
  if (err instanceof HttpException) {
    return {
      status: err.status,
      headers: err.headers,
      body: { message: err.message },
    };
  }
  const e = err as { message?: string; stack?: string };
  return {
    status: 500,
    body: process.env.NODE_ENV === 'production'
      ? { message: 'Internal Server Error' }
      : { message: e.message ?? 'Internal Server Error', stack: e.stack },
  };
};

export function createExceptionHandler(logger: Logger, renderer: ExceptionRenderer = defaultRenderer): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const rendered = renderer(err);
    if (rendered.status >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'unhandled exception');
    } else {
      logger.warn({ err: { name: (err as Error).name, message: (err as Error).message }, status: rendered.status, path: req.path }, 'http exception');
    }
    if (rendered.headers) {
      for (const [k, v] of Object.entries(rendered.headers)) res.setHeader(k, v);
    }
    if (res.headersSent) return;
    res.status(rendered.status).json(rendered.body);
  };
}
