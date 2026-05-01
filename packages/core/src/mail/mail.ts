import { Application } from '../application.js';
import type { Mailable, RenderedMessage } from './mailable.js';
import type { Mailer } from './mailer.js';

function mailer(): Mailer {
  return Application.current().mailer();
}

type Ctor<T> = new (...args: any[]) => T;

export const Mail = {
  send<T>(MailableClass: Ctor<Mailable<T>>, to: string | string[], payload: T): Promise<RenderedMessage> {
    return mailer().send(MailableClass, to, payload);
  },
  render<T>(MailableClass: Ctor<Mailable<T>>, payload: T): Promise<{ subject: string; html: string }> {
    return mailer().render(MailableClass, payload);
  },
  to(addr: string | string[]) {
    return {
      send<T>(MailableClass: Ctor<Mailable<T>>, payload: T): Promise<RenderedMessage> {
        return mailer().send(MailableClass, addr, payload);
      },
    };
  },
} as const;
