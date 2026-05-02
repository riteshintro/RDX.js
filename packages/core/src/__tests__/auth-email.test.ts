import { describe, it, expect, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { Application, AUTH_SCHEMA_SQL } from '../index.js';

async function bootApp(
  opts: {
    requireVerification?: boolean;
    sendOnSignUp?: boolean;
  } = {},
): Promise<Application> {
  const client = new PGlite();
  await client.exec(AUTH_SCHEMA_SQL);
  const db = drizzle(client);

  const app = new Application(process.cwd()).withConfig({
    logging: { level: 'silent' },
    app: { name: 'mailtest' },
    auth: {
      enabled: true,
      email: {
        requireVerification: opts.requireVerification ?? false,
        sendOnSignUp: opts.sendOnSignUp ?? false,
      },
      options: {
        secret: 'test-secret-32-chars-minimum-1234567890',
        baseURL: 'http://localhost',
        trustedOrigins: ['http://localhost'],
      },
    },
    mail: {
      transport: 'json',
      from: 'noreply@mailtest.com',
    },
  });
  app.container.instance('db', db as unknown as object);
  await app.boot();
  await app.httpKernel().ready();
  return app;
}

const SIGNUP = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'super-secret-pw',
};

describe('better-auth + Mail integration', () => {
  let app: Application;

  describe('with sendOnSignUp enabled', () => {
    beforeEach(async () => {
      app = await bootApp({ sendOnSignUp: true });
    });

    it('sends a verification email after signup via Mail facade', async () => {
      const before = app.mailer().sentMessages.length;
      const res = await request(app.httpKernel().fastify.server).post('/api/auth/sign-up/email').send(SIGNUP);
      expect(res.status).toBe(200);

      const sent = app.mailer().sentMessages.slice(before);
      expect(sent.length).toBeGreaterThanOrEqual(1);
      const verify = sent.find((s) => /Verify your email/.test(s.message.subject));
      expect(verify).toBeDefined();
      expect(verify?.message.to).toBe(SIGNUP.email);
      expect(verify?.message.from).toBe('noreply@mailtest.com');
      expect(verify?.message.html).toMatch(/Verify email/);
      expect(verify?.message.html).toMatch(/http:\/\/localhost/);
    });
  });

  describe('without sendOnSignUp', () => {
    beforeEach(async () => {
      app = await bootApp({ sendOnSignUp: false });
    });

    it('does not send verification email at signup', async () => {
      const before = app.mailer().sentMessages.length;
      const res = await request(app.httpKernel().fastify.server).post('/api/auth/sign-up/email').send(SIGNUP);
      expect(res.status).toBe(200);
      const sent = app.mailer().sentMessages.slice(before);
      expect(sent.find((s) => /Verify your email/.test(s.message.subject))).toBeUndefined();
    });
  });

  describe('forgot-password', () => {
    beforeEach(async () => {
      app = await bootApp();
      await request(app.httpKernel().fastify.server).post('/api/auth/sign-up/email').send(SIGNUP);
    });

    it('sends a password reset email when requested', async () => {
      const before = app.mailer().sentMessages.length;
      const res = await request(app.httpKernel().fastify.server)
        .post('/api/auth/request-password-reset')
        .send({ email: SIGNUP.email, redirectTo: 'http://localhost/reset' });
      expect(res.status).toBeLessThan(500);

      const sent = app.mailer().sentMessages.slice(before);
      const reset = sent.find((s) => /Reset your password/.test(s.message.subject));
      expect(reset).toBeDefined();
      expect(reset?.message.to).toBe(SIGNUP.email);
      expect(reset?.message.html).toMatch(/Reset password/);
    });
  });
});
