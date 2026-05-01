import { describe, it, expect, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import {
  Application,
  AUTH_SCHEMA_SQL,
  Auth,
  RequireAuth,
  Route,
  type Request as RdxRequest,
} from '../index.js';

async function bootApp(): Promise<Application> {
  const client = new PGlite();
  await client.exec(AUTH_SCHEMA_SQL);
  const db = drizzle(client);

  const app = new Application(process.cwd()).withConfig({
    logging: { level: 'silent' },
    auth: {
      enabled: true,
      options: {
        secret: 'test-secret-32-chars-minimum-1234567890',
        baseURL: 'http://localhost',
        trustedOrigins: ['http://localhost'],
      },
    },
  });
  app.container.instance('db', db as unknown as object);

  app.loadRoutesFrom(() => {
    Route.get('/me', async (req: RdxRequest) => ({
      user: req.user(),
      hasSession: req.authSession() !== null,
    })).middleware(RequireAuth);

    Route.get('/whoami', async (req: RdxRequest) => ({
      user: await Auth.user(req),
    }));
  });

  await app.boot();
  await app.httpKernel().ready();
  return app;
}

let app: Application;
beforeEach(async () => {
  app = await bootApp();
});

const SIGNUP = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'super-secret-pw',
};

describe('better-auth integration — signup + signin', () => {
  it('creates a user via /api/auth/sign-up/email', async () => {
    const res = await request(app.httpKernel().fastify.server)
      .post('/api/auth/sign-up/email')
      .send(SIGNUP);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(SIGNUP.email);
    expect(res.body.user.name).toBe(SIGNUP.name);
  });

  it('signs in an existing user', async () => {
    await request(app.httpKernel().fastify.server).post('/api/auth/sign-up/email').send(SIGNUP);

    const res = await request(app.httpKernel().fastify.server)
      .post('/api/auth/sign-in/email')
      .send({ email: SIGNUP.email, password: SIGNUP.password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(SIGNUP.email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects sign-in with bad password', async () => {
    await request(app.httpKernel().fastify.server).post('/api/auth/sign-up/email').send(SIGNUP);
    const res = await request(app.httpKernel().fastify.server)
      .post('/api/auth/sign-in/email')
      .send({ email: SIGNUP.email, password: 'wrong-password' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('RequireAuth middleware', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app.httpKernel().fastify.server).get('/me');
    expect(res.status).toBe(401);
  });

  it('passes with a valid session cookie', async () => {
    const agent = request.agent(app.httpKernel().fastify.server);

    const signup = await agent.post('/api/auth/sign-up/email').send(SIGNUP);
    expect(signup.status).toBe(200);

    const me = await agent.get('/me');
    expect(me.status).toBe(200);
    expect(me.body.user).toBeDefined();
    expect((me.body.user as { email: string }).email).toBe(SIGNUP.email);
    expect(me.body.hasSession).toBe(true);
  });
});

describe('Auth facade', () => {
  it('Auth.user(req) returns null when unauthenticated', async () => {
    const res = await request(app.httpKernel().fastify.server).get('/whoami');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('Auth.user(req) returns the user when signed in', async () => {
    const agent = request.agent(app.httpKernel().fastify.server);
    await agent.post('/api/auth/sign-up/email').send(SIGNUP);
    const res = await agent.get('/whoami');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect((res.body.user as { email: string }).email).toBe(SIGNUP.email);
  });
});
