import type { FastifyReply } from 'fastify';

export interface CookieOptions {
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none' | boolean;
  signed?: boolean;
}

export class Response {
  constructor(public readonly raw: FastifyReply) {}

  status(code: number): this {
    this.raw.code(code);
    return this;
  }

  json(data: unknown): void {
    void this.raw.send(data);
  }

  send(body: unknown): void {
    void this.raw.send(body);
  }

  noContent(): void {
    void this.raw.code(204).send();
  }

  redirect(url: string, status = 302): void {
    void this.raw.redirect(url, status);
  }

  header(name: string, value: string | string[]): this {
    this.raw.header(name, value);
    return this;
  }

  cookie(name: string, value: string, opts?: CookieOptions): this {
    const r = this.raw as unknown as { setCookie?: (n: string, v: string, o: CookieOptions) => void };
    r.setCookie?.(name, value, opts ?? {});
    return this;
  }

  clearCookie(name: string, opts?: CookieOptions): this {
    const r = this.raw as unknown as { clearCookie?: (n: string, o: CookieOptions) => void };
    r.clearCookie?.(name, opts ?? {});
    return this;
  }
}
