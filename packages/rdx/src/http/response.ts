import type { Response as ExpressResponse, CookieOptions } from 'express';

export class Response {
  constructor(public readonly raw: ExpressResponse) {}

  status(code: number): this {
    this.raw.status(code);
    return this;
  }

  json(data: unknown): void {
    this.raw.json(data);
  }

  send(body: unknown): void {
    this.raw.send(body);
  }

  noContent(): void {
    this.raw.status(204).end();
  }

  redirect(url: string, status = 302): void {
    this.raw.redirect(status, url);
  }

  header(name: string, value: string | string[]): this {
    this.raw.setHeader(name, value);
    return this;
  }

  cookie(name: string, value: string, opts?: CookieOptions): this {
    this.raw.cookie(name, value, opts ?? {});
    return this;
  }

  clearCookie(name: string, opts?: CookieOptions): this {
    this.raw.clearCookie(name, opts ?? {});
    return this;
  }
}
