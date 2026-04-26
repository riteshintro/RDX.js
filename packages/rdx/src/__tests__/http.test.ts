import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Application, HttpKernel, NotFoundException, BadRequestException, defineMiddleware, Request as RdxRequest } from '../index.js';

async function makeApp(setup?: (k: HttpKernel) => void): Promise<{ app: Application; kernel: HttpKernel }> {
  const a = new Application(process.cwd()).withConfig({
    logging: { level: 'silent' },
  });
  await a.boot();
  const k = a.httpKernel();
  setup?.(k);
  k.finalize();
  return { app: a, kernel: k };
}

describe('HttpKernel', () => {
  it('boots an express instance and 404s unknown routes via exception handler', async () => {
    const { kernel } = await makeApp();
    const res = await request(kernel.express).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: expect.stringContaining('Cannot GET') });
  });

  it('handles a registered route and parses JSON body', async () => {
    const { kernel } = await makeApp((k) => {
      k.express.post('/echo', (req, res) => {
        res.json({ echoed: req.body });
      });
    });
    const res = await request(kernel.express).post('/echo').send({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ echoed: { hello: 'world' } });
  });

  it('runs global middleware before route handlers', async () => {
    const log: string[] = [];
    const { kernel } = await makeApp((k) => {
      k.use(defineMiddleware((_req, _res, next) => {
        log.push('mw');
        next();
      }));
      k.express.get('/ping', (_req, res) => {
        log.push('route');
        res.json({ ok: true });
      });
    });
    const res = await request(kernel.express).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(log).toEqual(['mw', 'route']);
  });

  it('renders HttpException with proper status and body', async () => {
    const { kernel } = await makeApp((k) => {
      k.express.get('/bad', (_req, _res, next) => {
        next(new BadRequestException('nope'));
      });
      k.express.get('/missing', (_req, _res, next) => {
        next(new NotFoundException('gone'));
      });
    });
    const a = await request(kernel.express).get('/bad');
    expect(a.status).toBe(400);
    expect(a.body).toEqual({ message: 'nope' });

    const b = await request(kernel.express).get('/missing');
    expect(b.status).toBe(404);
    expect(b.body).toEqual({ message: 'gone' });
  });

  it('catches async errors and renders 500 in dev', async () => {
    const { kernel } = await makeApp((k) => {
      k.express.get('/boom', async () => {
        throw new Error('kaboom');
      });
    });
    const res = await request(kernel.express).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('kaboom');
  });

  it('listen + close lifecycle works with random port', async () => {
    const { kernel } = await makeApp((k) => {
      k.express.get('/health', (_req, res) => res.json({ ok: true }));
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
    let captured: Record<string, unknown> = {};
    const { kernel } = await makeApp((k) => {
      k.express.post('/capture', (req, res) => {
        const wrapped = new RdxRequest(req);
        captured = {
          methodOk: wrapped.method === 'POST',
          name: wrapped.input('name'),
          missing: wrapped.input('missing', 'fallback'),
          all: wrapped.all(),
          ct: wrapped.header('content-type'),
          token: wrapped.bearerToken(),
          isJson: wrapped.isJson(),
        };
        res.json(captured);
      });
    });
    const res = await request(kernel.express)
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
