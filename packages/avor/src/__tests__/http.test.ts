import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Application, HttpKernel, NotFoundException, BadRequestException, defineMiddleware, Route, Request as RdxRequest } from '../index.js';

interface SetupArgs {
  app: Application;
  kernel: HttpKernel;
  registerRoutes(register: () => void): void;
}

async function makeApp(setup?: (args: SetupArgs) => void): Promise<{ app: Application; kernel: HttpKernel }> {
  let routesRegister: (() => void) | null = null;
  const a = new Application(process.cwd()).withConfig({
    logging: { level: 'silent' },
  }).loadRoutesFrom(() => {
    if (routesRegister) routesRegister();
  });

  if (setup) {
    setup({
      app: a,
      kernel: undefined as unknown as HttpKernel,
      registerRoutes: (fn) => { routesRegister = fn; },
    });
  }

  await a.boot();
  await a.httpKernel().ready();
  return { app: a, kernel: a.httpKernel() };
}

describe('HttpKernel', () => {
  it('404s unknown routes via exception handler', async () => {
    const { kernel } = await makeApp();
    const res = await request(kernel.fastify.server).get('/nope');
    expect(res.status).toBe(404);
  });

  it('handles a registered route and parses JSON body', async () => {
    const { kernel } = await makeApp(({ registerRoutes }) => {
      registerRoutes(() => {
        Route.post('/echo', (req) => ({ echoed: req.body }));
      });
    });
    const res = await request(kernel.fastify.server).post('/echo').send({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ echoed: { hello: 'world' } });
  });

  it('runs global middleware before route handlers', async () => {
    const log: string[] = [];
    const { kernel } = await makeApp(({ app, registerRoutes }) => {
      app.use(defineMiddleware((_req, _res, next) => {
        log.push('mw');
        next();
      }));
      registerRoutes(() => {
        Route.get('/ping', () => {
          log.push('route');
          return { ok: true };
        });
      });
    });
    const res = await request(kernel.fastify.server).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(log).toEqual(['mw', 'route']);
  });

  it('renders HttpException with proper status and body', async () => {
    const { kernel } = await makeApp(({ registerRoutes }) => {
      registerRoutes(() => {
        Route.get('/bad', () => { throw new BadRequestException('nope'); });
        Route.get('/missing', () => { throw new NotFoundException('gone'); });
      });
    });
    const a = await request(kernel.fastify.server).get('/bad');
    expect(a.status).toBe(400);
    expect(a.body).toEqual({ message: 'nope' });

    const b = await request(kernel.fastify.server).get('/missing');
    expect(b.status).toBe(404);
    expect(b.body).toEqual({ message: 'gone' });
  });

  it('catches async errors and renders 500 in dev', async () => {
    const { kernel } = await makeApp(({ registerRoutes }) => {
      registerRoutes(() => {
        Route.get('/boom', async () => { throw new Error('kaboom'); });
      });
    });
    const res = await request(kernel.fastify.server).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('kaboom');
  });

  it('listen + close lifecycle works with random port', async () => {
    const { kernel } = await makeApp(({ registerRoutes }) => {
      registerRoutes(() => {
        Route.get('/health', () => ({ ok: true }));
      });
    });
    const server = await kernel.listen(0, '127.0.0.1');
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    await kernel.close();
  });
});

describe('Request wrapper', () => {
  it('exposes input(), all(), header(), bearerToken()', async () => {
    const { kernel } = await makeApp(({ registerRoutes }) => {
      registerRoutes(() => {
        Route.post('/capture', (req: RdxRequest) => ({
          methodOk: req.method === 'POST',
          name: req.input('name'),
          missing: req.input('missing', 'fallback'),
          all: req.all(),
          ct: req.header('content-type'),
          token: req.bearerToken(),
          isJson: req.isJson(),
        }));
      });
    });
    const res = await request(kernel.fastify.server)
      .post('/capture?q=1')
      .set('Authorization', 'Bearer abc.def')
      .set('Content-Type', 'application/json')
      .send({ name: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      methodOk: true,
      name: 'Alice',
      missing: 'fallback',
      token: 'abc.def',
      isJson: true,
    });
    expect(res.body.all).toMatchObject({ name: 'Alice', q: '1' });
  });
});
