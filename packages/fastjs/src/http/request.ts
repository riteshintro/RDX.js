import type { FastifyRequest } from 'fastify';

export class Request {
  constructor(public readonly raw: FastifyRequest) {}

  get method(): string { return this.raw.method; }
  get path(): string {
    const u = this.raw.url ?? '';
    const q = u.indexOf('?');
    return q === -1 ? u : u.slice(0, q);
  }
  get url(): string { return this.raw.url ?? ''; }
  get query(): Record<string, unknown> { return this.raw.query as Record<string, unknown>; }
  get params(): Record<string, string> { return this.raw.params as Record<string, string>; }
  get body(): unknown { return this.raw.body; }
  get headers(): NodeJS.Dict<string | string[]> { return this.raw.headers; }

  input<T = unknown>(key: string, defaultValue?: T): T {
    const body = this.raw.body as Record<string, unknown> | undefined;
    if (body && typeof body === 'object' && key in body) return body[key] as T;
    const q = this.raw.query as Record<string, unknown>;
    if (q && key in q) return q[key] as T;
    const p = this.raw.params as Record<string, unknown>;
    if (p && key in p) return p[key] as T;
    return defaultValue as T;
  }

  all(): Record<string, unknown> {
    const body = (this.raw.body && typeof this.raw.body === 'object') ? this.raw.body : {};
    return {
      ...(this.raw.query as object),
      ...(this.raw.params as object),
      ...(body as object),
    };
  }

  has(key: string): boolean {
    return this.input(key) !== undefined;
  }

  only(keys: string[]): Record<string, unknown> {
    const all = this.all();
    const out: Record<string, unknown> = {};
    for (const k of keys) if (k in all) out[k] = all[k];
    return out;
  }

  except(keys: string[]): Record<string, unknown> {
    const all = this.all();
    const out: Record<string, unknown> = { ...all };
    for (const k of keys) delete out[k];
    return out;
  }

  header(name: string): string | undefined {
    const v = this.raw.headers[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  }

  bearerToken(): string | undefined {
    const auth = this.header('authorization');
    if (!auth) return undefined;
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    return m?.[1];
  }

  ip(): string | undefined { return this.raw.ip; }

  isJson(): boolean {
    return /application\/json/i.test(this.header('content-type') || '');
  }

  expectsJson(): boolean {
    return /application\/json/i.test(this.header('accept') || '') || this.isJson();
  }

  isMultipart(): boolean {
    return /multipart\/form-data/i.test(this.header('content-type') || '');
  }

  validated<T = Record<string, unknown>>(): T {
    return ((this.raw as unknown as { _validated?: T })._validated ?? {}) as T;
  }

  bound<T = unknown>(name: string): T {
    const b = (this.raw as unknown as { _bindings?: Record<string, unknown> })._bindings;
    return (b?.[name]) as T;
  }

  user<T = unknown>(): T | null {
    return ((this.raw as unknown as { _user?: T })._user ?? null) as T | null;
  }

  authSession<T = unknown>(): T | null {
    return ((this.raw as unknown as { _session?: T })._session ?? null) as T | null;
  }

  file(field?: string): RdxUploadedFile | undefined {
    const r = this.raw as unknown as {
      _file?: RdxUploadedFile;
      _files?: RdxUploadedFile[];
    };
    if (r._file && (!field || r._file.fieldname === field)) return r._file;
    if (!r._files) return undefined;
    if (field) return r._files.find((f) => f.fieldname === field);
    return r._files[0];
  }

  files(field?: string): RdxUploadedFile[] {
    const r = this.raw as unknown as { _files?: RdxUploadedFile[] };
    if (!r._files) return [];
    if (field) return r._files.filter((f) => f.fieldname === field);
    return r._files;
  }
}

export interface RdxUploadedFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
