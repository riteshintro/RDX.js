import { createRequire } from 'node:module';
import Fastify, { type FastifyInstance } from 'fastify';
import { type Server } from 'node:http';
import type { Logger } from '../logging/logger.js';
import type { Container } from '../container/container.js';
import { createExceptionHandler, type ExceptionRenderer } from './exception-handler.js';
import { toFastifyHandler, type Middleware, type MiddlewareClass, type MiddlewareLike } from './middleware.js';
import { NotFoundException } from '../exceptions/http-exception.js';

const require = createRequire(import.meta.url);

export interface MultipartLimits {
  fileSize?: number;
  files?: number;
  fields?: number;
}

export interface HttpKernelOptions {
  bodyLimit?: number;
  trustProxy?: boolean | number | string;
  exceptionRenderer?: ExceptionRenderer;
  multipart?: MultipartLimits | false;
}

export class HttpKernel {
  readonly fastify: FastifyInstance;
  private finalized = false;
  private server: Server | null = null;

  constructor(
    private readonly container: Container,
    private readonly logger: Logger,
    private readonly options: HttpKernelOptions = {},
  ) {
    this.fastify = Fastify({
      bodyLimit: options.bodyLimit ?? 1024 * 1024,
      trustProxy: options.trustProxy as boolean | number,
      logger: false,
      disableRequestLogging: true,
    });

    if (options.multipart !== false) {
      const multipart = require('@fastify/multipart');
      void this.fastify.register(multipart, {
        limits: {
          fileSize: options.multipart?.fileSize ?? 10 * 1024 * 1024,
          files: options.multipart?.files ?? 10,
          fields: options.multipart?.fields ?? 100,
        },
      });
    }
  }

  use(mw: MiddlewareLike): this {
    this.assertNotFinalized();
    const handler = toFastifyHandler(mw, (cls) =>
      this.container.resolve<Middleware>(cls as unknown as MiddlewareClass),
    );
    this.fastify.addHook('preHandler', handler);
    return this;
  }

  register(plugin: any, opts?: any): this {
    this.assertNotFinalized();
    void this.fastify.register(plugin, opts);
    return this;
  }

  finalize(): this {
    if (this.finalized) return this;
    this.fastify.setNotFoundHandler(() => {
      throw new NotFoundException();
    });
    this.fastify.setErrorHandler(createExceptionHandler(this.logger, this.options.exceptionRenderer));
    this.finalized = true;
    return this;
  }

  async ready(): Promise<this> {
    this.finalize();
    await this.fastify.ready();
    return this;
  }

  async listen(port: number, host = '0.0.0.0'): Promise<Server> {
    this.finalize();
    await this.fastify.listen({ port, host });
    this.server = this.fastify.server;
    const addr = this.server.address();
    const actualPort = typeof addr === 'object' && addr ? addr.port : port;
    this.logger.info({ host, port: actualPort }, 'avor server listening');
    return this.server;
  }

  async close(): Promise<void> {
    if (!this.finalized) return;
    await this.fastify.close();
    this.server = null;
  }

  private assertNotFinalized(): void {
    if (this.finalized) {
      throw new Error('HttpKernel is finalized; cannot add middleware/plugins');
    }
  }
}
