import { Route } from 'fyron';

Route.get('/', () => ({ name: '__APP_NAME__', framework: 'fyron' }));

Route.get('/health', () => ({ status: 'ok' }));
