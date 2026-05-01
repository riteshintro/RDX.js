import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Buffer } from 'node:buffer';
import {
  Application,
  Route,
  Upload,
  type Request as RdxRequest,
} from '../index.js';

async function bootApp(register: () => void): Promise<Application> {
  const a = new Application(process.cwd())
    .withConfig({ logging: { level: 'silent' } })
    .loadRoutesFrom(register);
  await a.boot();
  await a.httpKernel().ready();
  return a;
}

describe('Upload.single', () => {
  let app: Application;
  beforeEach(async () => {
    app = await bootApp(() => {
      Route.post('/upload', (req: RdxRequest) => {
        const f = req.file('avatar');
        if (!f) return { ok: false };
        return {
          ok: true,
          field: f.fieldname,
          original: f.originalname,
          mime: f.mimetype,
          size: f.size,
          contents: f.buffer.toString('utf8'),
        };
      }).middleware(Upload.single('avatar'));
    });
  });

  it('parses a single file and exposes it via req.file()', async () => {
    const res = await request(app.httpKernel().fastify.server)
      .post('/upload')
      .attach('avatar', Buffer.from('hello world'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      field: 'avatar',
      original: 'a.txt',
      mime: 'text/plain',
      size: 11,
      contents: 'hello world',
    });
  });
});

describe('Upload.array', () => {
  let app: Application;
  beforeEach(async () => {
    app = await bootApp(() => {
      Route.post('/upload-many', (req: RdxRequest) => {
        const files = req.files('photos');
        return {
          count: files.length,
          names: files.map((f) => f.originalname),
        };
      }).middleware(Upload.array('photos', 3));
    });
  });

  it('accepts multiple files under one field, up to maxCount', async () => {
    const res = await request(app.httpKernel().fastify.server)
      .post('/upload-many')
      .attach('photos', Buffer.from('a'), 'one.jpg')
      .attach('photos', Buffer.from('bb'), 'two.jpg');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 2, names: ['one.jpg', 'two.jpg'] });
  });

  it('rejects when more than maxCount files attached', async () => {
    const res = await request(app.httpKernel().fastify.server)
      .post('/upload-many')
      .attach('photos', Buffer.from('a'), '1.jpg')
      .attach('photos', Buffer.from('a'), '2.jpg')
      .attach('photos', Buffer.from('a'), '3.jpg')
      .attach('photos', Buffer.from('a'), '4.jpg');
    expect(res.status).toBe(422);
  });
});

describe('Upload.fields', () => {
  let app: Application;
  beforeEach(async () => {
    app = await bootApp(() => {
      Route.post('/profile', (req: RdxRequest) => ({
        avatar: req.file('avatar')?.originalname,
        coverFirst: req.files('cover')[0]?.originalname,
        coverCount: req.files('cover').length,
      })).middleware(
        Upload.fields([
          { name: 'avatar', maxCount: 1 },
          { name: 'cover', maxCount: 5 },
        ]),
      );
    });
  });

  it('routes files to named field buckets', async () => {
    const res = await request(app.httpKernel().fastify.server)
      .post('/profile')
      .attach('avatar', Buffer.from('a'), 'me.png')
      .attach('cover', Buffer.from('b'), 'c1.png')
      .attach('cover', Buffer.from('c'), 'c2.png');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ avatar: 'me.png', coverFirst: 'c1.png', coverCount: 2 });
  });
});

describe('Upload size limits', () => {
  it('rejects files exceeding the configured limit', async () => {
    const app = await bootApp(() => {
      Route.post('/tiny', () => ({ ok: true })).middleware(
        Upload.single('file', { maxFileSize: 100 }),
      );
    });
    const big = Buffer.alloc(1024, 'x');
    const res = await request(app.httpKernel().fastify.server)
      .post('/tiny')
      .attach('file', big, 'big.bin');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
