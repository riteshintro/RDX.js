import { Cron } from 'croner';
import type { Logger } from '../logging/logger.js';

export type ScheduledFn = () => unknown | Promise<unknown>;

export interface ScheduledTaskOptions {
  name?: string;
  timezone?: string;
  preventOverlap?: boolean;
  paused?: boolean;
}

export interface ScheduledTask {
  readonly name: string;
  readonly cronExpression: string;
  readonly fn: ScheduledFn;
  readonly options: ScheduledTaskOptions;
  cron: Cron | null;
}

export class Scheduler {
  readonly tasks: ScheduledTask[] = [];
  private running = false;

  constructor(private readonly logger?: Logger) {}

  add(cronExpression: string, fn: ScheduledFn, options: ScheduledTaskOptions = {}): ScheduledTask {
    const name = options.name ?? `task#${this.tasks.length + 1}`;
    if (this.tasks.some((t) => t.name === name)) {
      throw new Error(`Scheduled task name [${name}] already exists`);
    }
    const task: ScheduledTask = { name, cronExpression, fn, options, cron: null };
    this.tasks.push(task);
    if (this.running) this.startTask(task);
    return task;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    for (const task of this.tasks) this.startTask(task);
    this.logger?.info({ count: this.tasks.length }, 'scheduler started');
  }

  stop(): void {
    if (!this.running) return;
    for (const task of this.tasks) {
      task.cron?.stop();
      task.cron = null;
    }
    this.running = false;
    this.logger?.info('scheduler stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  async trigger(name: string): Promise<unknown> {
    const task = this.tasks.find((t) => t.name === name);
    if (!task) throw new Error(`Scheduled task [${name}] not found`);
    return task.fn();
  }

  private startTask(task: ScheduledTask): void {
    if (task.cron) return;
    const log = this.logger;
    task.cron = new Cron(
      task.cronExpression,
      {
        name: task.name,
        timezone: task.options.timezone,
        protect: task.options.preventOverlap ?? true,
        paused: task.options.paused ?? false,
      },
      async () => {
        const start = Date.now();
        try {
          await task.fn();
          log?.debug({ task: task.name, ms: Date.now() - start }, 'scheduled task ran');
        } catch (err) {
          log?.error({ task: task.name, err }, 'scheduled task failed');
        }
      },
    );
  }
}
