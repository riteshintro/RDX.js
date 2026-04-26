import { fromNodeHeaders } from 'better-auth/node';
import { Application } from '../application.js';
import type { Request } from '../http/request.js';
import type { RdxAuthInstance } from './auth-config.js';

function instance(): RdxAuthInstance {
  return Application.current().auth();
}

export const Auth = {
  async session(req: Request): Promise<Awaited<ReturnType<RdxAuthInstance['api']['getSession']>>> {
    return instance().api.getSession({ headers: fromNodeHeaders(req.raw.headers) });
  },

  async user(req: Request): Promise<unknown> {
    const s = await Auth.session(req);
    return s?.user ?? null;
  },

  async signOut(req: Request): Promise<unknown> {
    return instance().api.signOut({ headers: fromNodeHeaders(req.raw.headers) });
  },

  api(): RdxAuthInstance['api'] {
    return instance().api;
  },
} as const;
