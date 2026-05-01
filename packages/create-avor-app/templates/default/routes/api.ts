import { Route } from 'avor';

Route.get('/', () => ({ name: '__APP_NAME__', framework: 'avor' }));

Route.get('/health', () => ({ status: 'ok' }));
