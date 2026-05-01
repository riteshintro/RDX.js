import { Application } from '../application.js';
import type { Scheduler, ScheduledFn, ScheduledTask, ScheduledTaskOptions } from './scheduler.js';

function s(): Scheduler {
  return Application.current().scheduler();
}

export const Schedule = {
  cron(expr: string, fn: ScheduledFn, opts?: ScheduledTaskOptions): ScheduledTask {
    return s().add(expr, fn, opts);
  },
  everyMinute(fn: ScheduledFn, opts?: ScheduledTaskOptions): ScheduledTask {
    return s().add('* * * * *', fn, opts);
  },
  everyFiveMinutes(fn: ScheduledFn, opts?: ScheduledTaskOptions): ScheduledTask {
    return s().add('*/5 * * * *', fn, opts);
  },
  hourly(fn: ScheduledFn, opts?: ScheduledTaskOptions): ScheduledTask {
    return s().add('0 * * * *', fn, opts);
  },
  daily(fn: ScheduledFn, opts?: ScheduledTaskOptions): ScheduledTask {
    return s().add('0 0 * * *', fn, opts);
  },
  dailyAt(time: string, fn: ScheduledFn, opts?: ScheduledTaskOptions): ScheduledTask {
    const [h, m = '0'] = time.split(':');
    return s().add(`${m} ${h} * * *`, fn, opts);
  },
  weekly(fn: ScheduledFn, opts?: ScheduledTaskOptions): ScheduledTask {
    return s().add('0 0 * * 0', fn, opts);
  },
  monthly(fn: ScheduledFn, opts?: ScheduledTaskOptions): ScheduledTask {
    return s().add('0 0 1 * *', fn, opts);
  },
} as const;
