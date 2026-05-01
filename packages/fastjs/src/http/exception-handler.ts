import type { FastifyReply, FastifyRequest } from 'fastify';
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
  const e = err as { message?: string; stack?: string; statusCode?: number };
  if (typeof e.statusCode === 'number' && e.statusCode >= 400 && e.statusCode < 600) {
    return { status: e.statusCode, body: { message: e.message ?? 'Error' } };
  }
  return {
    status: 500,
    body: process.env.NODE_ENV === 'production'
      ? { message: 'Internal Server Error' }
      : { message: e.message ?? 'Internal Server Error', stack: e.stack },
  };
};

export function createExceptionHandler(logger: Logger, renderer: ExceptionRenderer = defaultRenderer) {
  return async (err: Error, req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const rendered = renderer(err);
    if (rendered.status >= 500) {
      logger.error({ err, path: req.url, method: req.method }, 'unhandled exception');
    } else {
      logger.warn(
        { err: { name: err.name, message: err.message }, status: rendered.status, path: req.url },
        'http exception',
      );
    }
    if (rendered.headers) {
      for (const [k, v] of Object.entries(rendered.headers)) reply.header(k, v);
    }
    if (reply.sent) return;
    await reply.code(rendered.status).send(rendered.body);
  };
}
