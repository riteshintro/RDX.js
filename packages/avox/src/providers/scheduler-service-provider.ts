import { ServiceProvider } from './service-provider.js';
import { Scheduler } from '../scheduler/scheduler.js';
import type { Logger } from '../logging/logger.js';

export class SchedulerServiceProvider extends ServiceProvider {
  override register(): void {
    if (this.app.container.has('scheduler')) return;
    this.app.container.singleton('scheduler', () => {
      const logger = this.app.container.resolve<Logger>('logger');
      return new Scheduler(logger);
    });
    this.app.container.bind(Scheduler, (c) => c.resolve<Scheduler>('scheduler'));
  }
}
