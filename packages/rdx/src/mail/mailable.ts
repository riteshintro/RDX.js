export interface MailableContext<T = Record<string, unknown>> {
  to: string | string[];
  payload: T;
}

export interface RenderedMessage {
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export abstract class Mailable<T = Record<string, unknown>> {
  abstract subject(payload: T): string | Promise<string>;
  abstract data(payload: T): Record<string, unknown> | Promise<Record<string, unknown>>;

  template?(): string;
  source?(): string;

  from?(): string | undefined;
  cc?(): string | string[] | undefined;
  bcc?(): string | string[] | undefined;
  replyTo?(): string | undefined;
}
