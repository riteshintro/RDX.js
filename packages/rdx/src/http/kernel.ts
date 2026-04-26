import express, { type Express, type RequestHandler } from 'express';
import { type Server } from 'node:http';
import type { Logger } from '../logging/logger.js';
import type { Container } from '../container/container.js';
import { createExceptionHandler, type ExceptionRenderer } from './exception-handler.js';
import { toExpressHandler, type Middleware, type MiddlewareClass, type MiddlewareLike } from './middleware.js';
import { NotFoundException } from '../exceptions/http-exception.js';

export interface HttpKernelOptions {
  jsonLimit?: string;
  trustProxy?: boolean | number | string;
  exceptionRenderer?: ExceptionRenderer;
}

export class HttpKernel {
  readonly express: Express;
  private finalized = false;
  private server: Server | null = null;

  constructor(
    private readonly container: Container,
    private readonly logger: Logger,
    private readonly options: HttpKernelOptions = {},
  ) {
    this.express = express();
    if (options.trustProxy !== undefined) {
      this.express.set('trust proxy', options.trustProxy);
    }
    this.express.use(express.json({ limit: options.jsonLimit ?? '1mb' }));
    this.express.use(express.urlencoded({ extended: true }));
  }

  use(mw: MiddlewareLike): this {
    this.assertNotFinalized();
    this.express.use(
      toExpressHandler(mw, (cls) =>
        this.container.resolve<Middleware>(cls as unknown as MiddlewareClass),
      ),
    );
    return this;
  }

  rawHandler(handler: RequestHandler): this {
    this.assertNotFinalized();
    this.express.use(handler);
    return this;
  }

  finalize(): this {
    if (this.finalized) return this;
    this.express.use((req, _res, next) => {
      next(new NotFoundException(`Cannot ${req.method} ${req.path}`));
    });
    this.express.use(createExceptionHandler(this.logger, this.options.exceptionRenderer));
    this.finalized = true;
    return this;
  }

  private assertNotFinalized(): void {
    if (this.finalized) {
      throw new Error('HttpKernel is finalized; cannot add middleware/handlers');
    }
  }

  listen(port: number, host = '0.0.0.0'): Promise<Server> {
    this.finalize();
    return new Promise((resolve, reject) => {
      const server = this.express.listen(port, host, () => {
        this.server = server;
        const addr = server.address();
        const actualPort = typeof addr === 'object' && addr ? addr.port : port;
        this.logger.info({ host, port: actualPort }, 'rdx server listening');
        resolve(server);
      });
      server.on('error', reject);
    });
  }

  close(): Promise<void> {
    if (!this.server) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.server!.close((err) => (err ? reject(err) : resolve()));
      this.server = null;
    });
  }
}
