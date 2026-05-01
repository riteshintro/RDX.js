import { injectable } from 'tsyringe';
import type { Request, Response } from 'fyron';
import { Post } from '../../Models/Post.js';

@injectable()
export class PostController {
  async index(): Promise<Post[]> {
    return Post.all() as Promise<Post[]>;
  }

  async show(req: Request): Promise<Post | null> {
    return Post.find(Number(req.params.id)) as Promise<Post | null>;
  }

  async store(req: Request, res: Response): Promise<Post> {
    const data = req.validated<{ title: string; body: string }>();
    const post = await Post.create(data) as Post;
    res.status(201);
    return post;
  }
}
