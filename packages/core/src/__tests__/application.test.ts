import { describe, it, expect } from 'vitest';
import { Application, ServiceProvider, config, app } from '../index.js';

describe('Application', () => {
  it('boots with no providers', async () => {
    const a = new Application(process.cwd());
    await a.boot();
    expect(a.isBooted()).toBe(true);
    expect(a.config()).toBeDefined();
    expect(a.logger()).toBeDefined();
  });

  it('runs register then boot for each provider in order', async () => {
    const order: string[] = [];

    class P1 extends ServiceProvider {
      override register() {
        order.push('P1.register');
      }
      override async boot() {
        order.push('P1.boot');
      }
    }
    class P2 extends ServiceProvider {
      override register() {
        order.push('P2.register');
      }
      override async boot() {
        order.push('P2.boot');
      }
    }

    const a = new Application(process.cwd()).withProviders([P1, P2]);
    await a.boot();

    expect(order).toEqual(['P1.register', 'P2.register', 'P1.boot', 'P2.boot']);
  });

  it('exposes config via helper after boot', async () => {
    const a = new Application(process.cwd()).withConfig({
      app: { name: 'test-app', port: 3000 },
    });
    await a.boot();

    expect(config<string>('app.name')).toBe('test-app');
    expect(config<number>('app.port')).toBe(3000);
    expect(config('missing', 'default')).toBe('default');
    expect(app()).toBe(a);
  });

  it('binds singleton via container', async () => {
    const a = new Application(process.cwd());
    let count = 0;
    a.container.singleton('counter', () => ({ value: ++count }));
    await a.boot();

    const x = a.container.resolve<{ value: number }>('counter');
    const y = a.container.resolve<{ value: number }>('counter');
    expect(x).toBe(y);
    expect(x.value).toBe(1);
  });
});
