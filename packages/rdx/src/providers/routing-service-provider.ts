import { ServiceProvider } from './service-provider.js';
import { Router } from '../routing/router.js';
import { RouteCompiler } from '../routing/compiler.js';

export class RoutingServiceProvider extends ServiceProvider {
  override register(): void {
    this.app.container.singleton(Router, () => new Router());
    this.app.container.singleton(RouteCompiler, (c) => new RouteCompiler(c));
    this.app.container.bind('router', (c) => c.resolve(Router));
    this.app.container.bind('routeCompiler', (c) => c.resolve(RouteCompiler));
  }
}
