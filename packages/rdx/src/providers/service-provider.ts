import type { Application } from '../application.js';

export abstract class ServiceProvider {
  constructor(protected readonly app: Application) {}
  register(): void {}
  async boot(): Promise<void> {}
}
