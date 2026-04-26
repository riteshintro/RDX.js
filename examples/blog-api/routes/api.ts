import { Route, RequireAuth } from 'rdx';
import { PostController } from '../app/Http/Controllers/PostController.js';
import { StorePostRequest } from '../app/Http/Requests/StorePostRequest.js';

Route.get('/', () => ({ name: 'blog-api' }));
Route.get('/health', () => ({ status: 'ok' }));

Route.group({ prefix: '/api/v1' }, () => {
  Route.get('/posts', [PostController, 'index']).name('posts.index');
  Route.get('/posts/{id}', [PostController, 'show']).name('posts.show');
  Route.post('/posts', [PostController, 'store'])
    .middleware(RequireAuth, StorePostRequest)
    .name('posts.store');
});
