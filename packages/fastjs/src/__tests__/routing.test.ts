import { describe, it, expect, beforeEach } from 'vitest';
import { injectable, inject } from 'tsyringe';
import request from 'supertest';
import { Application, Route, Router, Request, Response, defineMiddleware } from '../index.js';

async function bootApp(register: () => void): Promise<Application> {
  const a = new Application(process.cwd())
    .withConfig({ logging: { level: 'silent' } })
    .loadRoutesFrom(register);
  await a.boot();
  await a.httpKernel().ready();
  return a;
}

describe('Routing — function handlers', () => {
  it('handles GET with auto-JSON return', async () => {
    const a = await bootApp(() => {
      Route.get('/ping', () => ({ pong: true }));
    });
    const res = await request(a.httpKernel().fastify.server).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pong: true });
  });

  it('handles POST and reads input via Request wrapper', async () => {
    const a = await bootApp(() => {
      Route.post('/echo', (req: Request) => ({
        name: req.input<string>('name'),
        all: req.all(),
      }));
    });
    const res = await request(a.httpKernel().fastify.server)
      .post('/echo')
      .send({ name: 'Bob', x: 1 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Bob');
    expect(res.body.all).toMatchObject({ name: 'Bob', x: 1 });
  });

  it('translates {param} syntax to express :param', async () => {
    const a = await bootApp(() => {
      Route.get('/users/{id}', (req: Request) => ({ id: req.params.id }));
    });
    const res = await request(a.httpKernel().fastify.server).get('/users/42');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: '42' });
  });
});

describe('Routing — controller actions', () => {
  it('resolves a class controller from container per request', async () => {
    @injectable()
    class UserController {
      index() { return { list: ['a', 'b'] }; }
      show(req: Request) { return { user: req.params.id }; }
    }

    const a = await bootApp(() => {
      Route.get('/users', [UserController, 'index']);
      Route.get('/users/{id}', [UserController, 'show']);
    });

    const list = await request(a.httpKernel().fastify.server).get('/users');
    expect(list.body).toEqual({ list: ['a', 'b'] });

    const one = await request(a.httpKernel().fastify.server).get('/users/7');
    expect(one.body).toEqual({ user: '7' });
  });

  it('controller can inject Request from per-request scope', async () => {
    @injectable()
    class WhoamiController {
      constructor(@inject(Request) public req: Request) {}
      handle() { return { path: this.req.path, method: this.req.method }; }
    }

    const a = await bootApp(() => {
      Route.get('/whoami', [WhoamiController, 'handle']);
    });

    const res = await request(a.httpKernel().fastify.server).get('/whoami');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ path: '/whoami', method: 'GET' });
  });
});

describe('Routing — groups', () => {
  it('applies prefix and stacks middleware', async () => {
    const log: string[] = [];
    const audit = defineMiddleware((_req, _res, next) => {
      log.push('audit');
      next();
    });
    const auth = defineMiddleware((_req, _res, next) => {
      log.push('auth');
      next();
    });

    const a = await bootApp(() => {
      Route.group({ prefix: '/api', middleware: [audit] }, () => {
        Route.group({ prefix: '/v1', middleware: [auth] }, () => {
          Route.get('/health', () => ({ ok: true }));
        });
      });
    });

    const res = await request(a.httpKernel().fastify.server).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(log).toEqual(['audit', 'auth']);
  });

  it('supports named routes via Route.url()', async () => {
    const a = await bootApp(() => {
      Route.group({ name: 'admin.' }, () => {
        Route.get('/admin/users/{id}', () => ({})).name('users.show');
      });
    });

    expect(Route.url('admin.users.show', { id: 99 })).toBe('/admin/users/99');
    const router = a.container.resolve(Router);
    expect(router.routes).toHaveLength(1);
    expect(router.routes[0]!.name).toBe('admin.users.show');
  });
});

describe('Routing — middleware on a single route', () => {
  let a: Application;

  beforeEach(async () => {
    const blockUnauthed = defineMiddleware((req: Request, _res, next) => {
      if (req.header('x-token') !== 'secret') {
        next(new Error('forbidden'));
        return;
      }
      next();
    });

    a = await bootApp(() => {
      Route.get('/protected', () => ({ ok: true })).middleware(blockUnauthed);
    });
  });

  it('rejects when middleware throws', async () => {
    const res = await request(a.httpKernel().fastify.server).get('/protected');
    expect(res.status).toBe(500);
  });

  it('passes when middleware accepts', async () => {
    const res = await request(a.httpKernel().fastify.server).get('/protected').set('x-token', 'secret');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
