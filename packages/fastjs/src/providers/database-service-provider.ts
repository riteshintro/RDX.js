import { ServiceProvider } from './service-provider.js';
import { createPgConnection, type DbConfig } from '../database/connection.js';
import type { Pool } from 'pg';

export class DatabaseServiceProvider extends ServiceProvider {
  private pool: Pool | null = null;

  override register(): void {
    if (this.app.container.has('db')) return;
    this.app.container.singleton('db', () => {
      const cfg = this.app.config().get<DbConfig>('database', {});
      const { db, pool } = createPgConnection(cfg);
      this.pool = pool;
      return db;
    });
  }

  override async boot(): Promise<void> {
    this.app.onShutdown(async () => {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
    });
  }
}
