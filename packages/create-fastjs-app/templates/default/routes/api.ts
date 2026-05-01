import { Route } from 'fastjs';

Route.get('/', () => ({ name: '__APP_NAME__', framework: 'fastjs' }));

Route.get('/health', () => ({ status: 'ok' }));
