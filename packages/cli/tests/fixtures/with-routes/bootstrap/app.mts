import { Application, Route } from 'avoxjs';

export default async function () {
  return new Application(process.cwd())
    .withConfig({ logging: { level: 'silent' } })
    .loadRoutesFrom(() => {
      Route.get('/health', () => ({ ok: true })).name('health');
      Route.post('/items', () => ({})).name('items.store');
    });
}
