import { Route } from 'rdx';

Route.get('/', () => ({ name: '__APP_NAME__', framework: 'rdx' }));

Route.get('/health', () => ({ status: 'ok' }));
