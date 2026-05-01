import { injectable } from 'tsyringe';
import { z } from 'zod';
import { FormRequest } from 'avox/validation';

@injectable()
export class StorePostRequest extends FormRequest {
  rules() {
    return z.object({
      title: z.string().min(3).max(200),
      body: z.string().min(1),
    });
  }
}
