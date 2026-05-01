import { Route } from 'avox';

Route.get('/', () => ({ name: '__APP_NAME__', framework: 'avox' }));

Route.get('/health', () => ({ status: 'ok' }));
