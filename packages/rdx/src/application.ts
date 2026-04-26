import 'reflect-metadata';
import type { Server } from 'node:http';
import { Container } from './container/container.js';
import { ConfigRepository, type ConfigData } from './config/repository.js';
import { createLogger, type Logger } from './logging/logger.js';
import { loadEnv } from './support/env.js';
import type { ServiceProvider } from './providers/service-provider.js';
import { HttpServiceProvider } from './providers/http-service-provider.js';
import { RoutingServiceProvider } from './providers/routing-service-provider.js';
import { DatabaseServiceProvider } from './providers/database-service-provider.js';
import { AuthServiceProvider } from './providers/auth-service-provider.js';
import { HttpKernel } from './http/kernel.js';
import { Router } from './routing/router.js';
import { RouteCompiler } from './routing/compiler.js';
import type { RdxAuthInstance } from './auth/auth-config.js';

export type ProviderClass = new (app: Application) => ServiceProvider;

let currentApp: Application | null = null;

export class Application {
  readonly container: Container;
  readonly basePath: string;
  private readonly providerClasses: ProviderClass[] = [];
  private readonly providers: ServiceProvider[] = [];
  private booted = false;
  private initialConfig: ConfigData = {};
  private builtIns: ProviderClass[] = [HttpServiceProvider, RoutingServiceProvider, DatabaseServiceProvider, AuthServiceProvider];
  private routesLoader: (() => unknown | Promise<unknown>) | null = null;
  private shutdownHooks: Array<() => unknown | Promise<unknown>> = [];

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.container = new Container();
    currentApp = this;
  }

  static current(): Application {
    if (!currentApp) {
      throw new Error('No Application instance. Construct one first.');
    }
    return currentApp;
  }

  withConfig(data: ConfigData): this {
    this.initialConfig = { ...this.initialConfig, ...data };
    return this;
  }

  withProviders(providers: ProviderClass[]): this {
    this.providerClasses.push(...providers);
    return this;
  }

  withoutBuiltIn(provider: ProviderClass): this {
    this.builtIns = this.builtIns.filter((p) => p !== provider);
    return this;
  }

  loadRoutesFrom(loader: () => unknown | Promise<unknown>): this {
    this.routesLoader = loader;
    return this;
  }

  async boot(): Promise<void> {
    if (this.booted) return;

    loadEnv(this.basePath);

    const config = new ConfigRepository(this.initialConfig);
    this.container.instance('config', config);
    this.container.instance(ConfigRepository, config);

    const logger = createLogger({
      level: config.get<string>('logging.level', process.env.LOG_LEVEL || 'info'),
    });
    this.container.instance('logger', logger);

    this.container.instance('app', this);
    this.container.instance(Application, this);

    const all: ProviderClass[] = [...this.builtIns, ...this.providerClasses];

    for (const P of all) {
      const p = new P(this);
      this.providers.push(p);
      p.register();
    }

    for (const p of this.providers) {
      await p.boot();
    }

    if (this.container.has('httpKernel')) {
      this.httpKernel().setupBodyParsing();
    }

    if (this.routesLoader) {
      await this.routesLoader();
    }

    if (this.container.has('router') && this.container.has('httpKernel')) {
      const router = this.container.resolve<Router>('router');
      const compiler = this.container.resolve<RouteCompiler>('routeCompiler');
      compiler.compile(router.routes, this.httpKernel());
    }

    this.booted = true;
    logger.info(
      {
        basePath: this.basePath,
        providers: this.providers.length,
        routes: this.container.has('router') ? this.container.resolve<Router>('router').routes.length : 0,
      },
      'rdx booted',
    );
  }

  httpKernel(): HttpKernel {
    return this.container.resolve<HttpKernel>('httpKernel');
  }

  router(): Router {
    return this.container.resolve<Router>('router');
  }

  db<T = unknown>(): T {
    return this.container.resolve<T>('db');
  }

  auth(): RdxAuthInstance {
    return this.container.resolve<RdxAuthInstance>('auth');
  }

  onShutdown(fn: () => unknown | Promise<unknown>): this {
    this.shutdownHooks.push(fn);
    return this;
  }

  async listen(port?: number, host?: string): Promise<Server> {
    if (!this.booted) await this.boot();
    const cfg = this.config();
    const p = port ?? cfg.get<number>('app.port', 3000);
    const h = host ?? cfg.get<string>('app.host', '0.0.0.0');
    return this.httpKernel().listen(p, h);
  }

  async shutdown(): Promise<void> {
    if (!this.booted) return;
    for (const fn of this.shutdownHooks.reverse()) {
      try { await fn(); } catch (e) { this.logger().warn({ err: e }, 'shutdown hook failed'); }
    }
    if (this.container.has('httpKernel')) {
      await this.httpKernel().close();
    }
  }

  config(): ConfigRepository {
    return this.container.resolve<ConfigRepository>('config');
  }

  logger(): Logger {
    return this.container.resolve<Logger>('logger');
  }

  isBooted(): boolean {
    return this.booted;
  }
}
