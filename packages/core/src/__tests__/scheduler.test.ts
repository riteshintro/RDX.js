import { describe, it, expect, beforeEach } from 'vitest';
import { Application, Schedule } from '../index.js';

let app: Application;
beforeEach(async () => {
  app = new Application(process.cwd()).withConfig({
    logging: { level: 'silent' },
  });
  await app.boot();
});

describe('Scheduler', () => {
  it('registers tasks via Schedule facade', () => {
    Schedule.cron('*/5 * * * *', () => {}, { name: 'every-5' });
    Schedule.daily(() => {}, { name: 'midnight' });
    const s = app.scheduler();
    expect(s.tasks).toHaveLength(2);
    expect(s.tasks.map((t) => t.name)).toEqual(['every-5', 'midnight']);
    expect(s.tasks[0]!.cronExpression).toBe('*/5 * * * *');
    expect(s.tasks[1]!.cronExpression).toBe('0 0 * * *');
  });

  it('rejects duplicate task names', () => {
    Schedule.cron('* * * * *', () => {}, { name: 'dup' });
    expect(() => Schedule.cron('* * * * *', () => {}, { name: 'dup' })).toThrow(/already exists/);
  });

  it('Schedule.dailyAt parses HH:MM into cron', () => {
    Schedule.dailyAt('14:30', () => {}, { name: 'afternoon' });
    expect(app.scheduler().tasks[0]!.cronExpression).toBe('30 14 * * *');
  });

  it('trigger() runs the task function on demand', async () => {
    let runs = 0;
    Schedule.cron('0 0 1 1 *', () => { runs++; }, { name: 'newyear' });
    await app.scheduler().trigger('newyear');
    expect(runs).toBe(1);
  });

  it('start() activates crons (validates expression)', () => {
    Schedule.everyMinute(() => {}, { name: 'mn' });
    const s = app.scheduler();
    expect(s.isRunning()).toBe(false);
    s.start();
    expect(s.isRunning()).toBe(true);
    expect(s.tasks[0]!.cron).not.toBeNull();
    s.stop();
    expect(s.isRunning()).toBe(false);
  });

  it('rejects invalid cron expression at start', () => {
    Schedule.cron('not a cron expr', () => {}, { name: 'broken' });
    expect(() => app.scheduler().start()).toThrow();
  });
});
