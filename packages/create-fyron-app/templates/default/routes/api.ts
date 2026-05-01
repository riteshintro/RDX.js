import { Route } from 'fyronjs';

Route.get('/', () => ({ name: '__APP_NAME__', framework: 'fyronjs' }));

Route.get('/health', () => ({ status: 'ok' }));
