import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createTransport, type Transporter, type SendMailOptions } from 'nodemailer';
import Handlebars from 'handlebars';
import type { Logger } from '../logging/logger.js';
import type { Mailable, RenderedMessage } from './mailable.js';

export interface MailConfig {
  transport?: 'smtp' | 'json' | 'stream' | 'sendmail';
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: { user: string; pass: string };
  from?: string;
  templatesPath?: string;
}

type Ctor<T> = new (...args: any[]) => T;

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

export class Mailer {
  readonly transporter: Transporter;
  readonly defaultFrom: string | undefined;
  readonly templatesPath: string;
  readonly sentMessages: Array<{ message: RenderedMessage; info: unknown }> = [];

  constructor(
    private readonly cfg: MailConfig,
    private readonly basePath: string,
    private readonly logger?: Logger,
  ) {
    this.transporter = this.buildTransporter();
    this.defaultFrom = cfg.from;
    this.templatesPath = resolve(basePath, cfg.templatesPath ?? 'resources/mail');
  }

  async send<T>(MailableClass: Ctor<Mailable<T>>, to: string | string[], payload: T): Promise<RenderedMessage> {
    const inst = new MailableClass();
    const data = await inst.data(payload);
    const subject = await inst.subject(payload);
    const html = await this.renderMailable(inst, data);
    const message: RenderedMessage = {
      to,
      subject,
      html,
      from: inst.from?.() ?? this.defaultFrom,
      cc: inst.cc?.(),
      bcc: inst.bcc?.(),
      replyTo: inst.replyTo?.(),
    };
    const opts: SendMailOptions = {
      from: message.from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      replyTo: message.replyTo,
      subject: message.subject,
      html: message.html,
    };
    const info = await this.transporter.sendMail(opts);
    this.sentMessages.push({ message, info });
    this.logger?.debug({ to, subject, mailable: MailableClass.name }, 'mail sent');
    return message;
  }

  async render<T>(MailableClass: Ctor<Mailable<T>>, payload: T): Promise<{ subject: string; html: string }> {
    const inst = new MailableClass();
    const data = await inst.data(payload);
    const subject = await inst.subject(payload);
    const html = await this.renderMailable(inst, data);
    return { subject, html };
  }

  private async renderMailable(inst: Mailable<unknown>, data: Record<string, unknown>): Promise<string> {
    const inlineSource = inst.source?.();
    if (inlineSource !== undefined) {
      const cacheKey = `__inline:${inst.constructor.name}`;
      let tpl = templateCache.get(cacheKey);
      if (!tpl) {
        tpl = Handlebars.compile(inlineSource, { noEscape: false });
        templateCache.set(cacheKey, tpl);
      }
      return tpl(data);
    }
    const name = inst.template?.();
    if (!name) {
      throw new Error(`Mailable ${inst.constructor.name} must implement template() or source()`);
    }
    return this.renderFileTemplate(name, data);
  }

  private async renderFileTemplate(name: string, data: Record<string, unknown>): Promise<string> {
    const file = name.endsWith('.hbs') ? name : `${name}.hbs`;
    const path = join(this.templatesPath, file);
    if (!existsSync(path)) {
      throw new Error(`Mail template not found: ${path}`);
    }
    let tpl = templateCache.get(path);
    if (!tpl) {
      const source = await readFile(path, 'utf8');
      tpl = Handlebars.compile(source, { noEscape: false });
      templateCache.set(path, tpl);
    }
    return tpl(data);
  }

  private buildTransporter(): Transporter {
    const t = this.cfg.transport ?? 'json';
    if (t === 'json') return createTransport({ jsonTransport: true });
    if (t === 'stream') return createTransport({ streamTransport: true, buffer: true });
    if (t === 'sendmail') return createTransport({ sendmail: true });
    return createTransport({
      host: this.cfg.host,
      port: this.cfg.port ?? 587,
      secure: this.cfg.secure ?? false,
      auth: this.cfg.auth,
    });
  }
}
