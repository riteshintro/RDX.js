import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import request from 'supertest';
import {
  Application,
  Route,
  Request,
  Response,
  validate,
  FormRequest,
} from '../index.js';

async function bootApp(register: () => void): Promise<Application> {
  const a = new Application(process.cwd())
    .withConfig({ logging: { level: 'silent' } })
    .loadRoutesFrom(register);
  await a.boot();
  await a.httpKernel().ready();
  return a;
}

describe('validate() middleware', () => {
  it('accepts valid input and exposes via req.validated()', async () => {
    const schema = z.object({ name: z.string().min(2), age: z.number().int().min(0) });
    const app = await bootApp(() => {
      Route.post('/users', (req: Request) => req.validated())
        .middleware(validate(schema));
    });
    const res = await request(app.httpKernel().fastify.server)
      .post('/users')
      .send({ name: 'Alice', age: 30 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'Alice', age: 30 });
  });

  it('rejects invalid input with 422 and field errors', async () => {
    const schema = z.object({ email: z.string().email(), age: z.number().int().min(18) });
    const app = await bootApp(() => {
      Route.post('/users', () => ({ ok: true })).middleware(validate(schema));
    });
    const res = await request(app.httpKernel().fastify.server)
      .post('/users')
      .send({ email: 'not-an-email', age: 12 });
    expect(res.status).toBe(422);
    expect(res.body.errors).toMatchObject({
      email: expect.any(Array),
      age: expect.any(Array),
    });
    expect(res.body.errors.email[0]).toMatch(/email/i);
  });
});

describe('FormRequest class', () => {
  class CreateUserRequest extends FormRequest {
    rules() {
      return z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });
    }
  }

  class GuardedRequest extends FormRequest {
    rules() { return z.object({}); }
    override authorize(req: Request) { return req.header('x-token') === 'ok'; }
  }

  it('validates and exposes data via req.validated()', async () => {
    const app = await bootApp(() => {
      Route.post('/users', (req: Request) => req.validated())
        .middleware(CreateUserRequest);
    });
    const res = await request(app.httpKernel().fastify.server)
      .post('/users')
      .send({ name: 'A', email: 'a@b.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'A', email: 'a@b.com' });
  });

  it('returns 422 on validation failure', async () => {
    const app = await bootApp(() => {
      Route.post('/users', () => ({})).middleware(CreateUserRequest);
    });
    const res = await request(app.httpKernel().fastify.server).post('/users').send({});
    expect(res.status).toBe(422);
    expect(res.body.errors.name).toBeDefined();
    expect(res.body.errors.email).toBeDefined();
  });

  it('returns 403 when authorize() returns false', async () => {
    const app = await bootApp(() => {
      Route.post('/secret', () => ({ ok: true })).middleware(GuardedRequest);
    });
    const denied = await request(app.httpKernel().fastify.server).post('/secret').send({});
    expect(denied.status).toBe(403);

    const allowed = await request(app.httpKernel().fastify.server)
      .post('/secret')
      .set('x-token', 'ok')
      .send({});
    expect(allowed.status).toBe(200);
  });
});

describe('Route model binding', () => {
  it('runs Route.bind resolver before action and exposes via req.bound()', async () => {
    const fakeUser = { id: 7, name: 'Alice' };
    const app = await bootApp(() => {
      Route.bind('user', async (id) => {
        if (id === '7') return fakeUser;
        throw new Error(`User ${id} not found`);
      });
      Route.get('/users/{user}', (req: Request) => ({
        bound: req.bound('user'),
        rawId: req.params.user,
      }));
    });

    const ok = await request(app.httpKernel().fastify.server).get('/users/7');
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ bound: fakeUser, rawId: '7' });
  });

  it('propagates binder errors via the exception handler', async () => {
    const app = await bootApp(() => {
      Route.bind('post', async () => {
        throw new Error('not found');
      });
      Route.get('/posts/{post}', () => ({}));
    });
    const res = await request(app.httpKernel().fastify.server).get('/posts/99');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('not found');
  });
});
