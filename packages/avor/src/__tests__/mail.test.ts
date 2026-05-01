import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Application, Mail, Mailable } from '../index.js';

interface WelcomePayload { name: string; verifyUrl: string }

class WelcomeMail extends Mailable<WelcomePayload> {
  override subject(p: WelcomePayload): string {
    return `Welcome ${p.name}!`;
  }
  override template(): string {
    return 'welcome';
  }
  override async data(p: WelcomePayload): Promise<Record<string, unknown>> {
    return { name: p.name, link: p.verifyUrl };
  }
  override from(): string {
    return 'noreply@example.com';
  }
}

class HtmlEscapeMail extends Mailable<{ note: string }> {
  override subject(): string { return 'note'; }
  override template(): string { return 'escape'; }
  override async data(p: { note: string }): Promise<Record<string, unknown>> {
    return { note: p.note };
  }
}

let dir: string;
let app: Application;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'avor-mail-'));
  await mkdir(join(dir, 'resources/mail'), { recursive: true });
  await writeFile(
    join(dir, 'resources/mail/welcome.hbs'),
    `<h1>Hello {{name}}</h1>\n<p>Verify at <a href="{{link}}">{{link}}</a></p>`,
    'utf8',
  );
  await writeFile(
    join(dir, 'resources/mail/escape.hbs'),
    `<p>{{note}}</p>`,
    'utf8',
  );

  app = new Application(dir).withConfig({
    logging: { level: 'silent' },
    mail: {
      transport: 'json',
      from: 'system@example.com',
    },
  });
  await app.boot();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('Mail', () => {
  it('renders a template with payload data and exposes subject/html', async () => {
    const { subject, html } = await Mail.render(WelcomeMail, {
      name: 'Alice',
      verifyUrl: 'https://example.com/v/abc',
    });
    expect(subject).toBe('Welcome Alice!');
    expect(html).toContain('<h1>Hello Alice</h1>');
    expect(html).toContain('https://example.com/v/abc');
  });

  it('Mail.send() sends via the JSON transport and records the message', async () => {
    const msg = await Mail.send(WelcomeMail, 'alice@example.com', {
      name: 'Alice',
      verifyUrl: 'https://x.test',
    });
    expect(msg.to).toBe('alice@example.com');
    expect(msg.subject).toBe('Welcome Alice!');
    expect(msg.from).toBe('noreply@example.com');
    expect(app.mailer().sentMessages).toHaveLength(1);
  });

  it('Mail.to(addr).send() works as a fluent helper', async () => {
    await Mail.to(['a@x.com', 'b@x.com']).send(WelcomeMail, { name: 'Pair', verifyUrl: '#' });
    expect(app.mailer().sentMessages).toHaveLength(1);
    expect(app.mailer().sentMessages[0]!.message.to).toEqual(['a@x.com', 'b@x.com']);
  });

  it('Mailable.from() falls back to default from when not overridden', async () => {
    const msg = await Mail.send(HtmlEscapeMail, 'x@y.com', { note: 'hi' });
    expect(msg.from).toBe('system@example.com');
  });

  it('escapes HTML by default in handlebars', async () => {
    const { html } = await Mail.render(HtmlEscapeMail, { note: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('throws if template file missing', async () => {
    class MissingTplMail extends Mailable {
      override subject(): string { return 'x'; }
      override template(): string { return 'does-not-exist'; }
      override async data(): Promise<Record<string, unknown>> { return {}; }
    }
    await expect(Mail.send(MissingTplMail, 'a@b.c', {})).rejects.toThrow(/template not found/);
  });
});
