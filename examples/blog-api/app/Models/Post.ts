import { Model } from '@avoxjs/core/database';
import { postsTable } from '../../database/schema/posts.js';

export class Post extends Model {
  static override readonly table = postsTable;
}
