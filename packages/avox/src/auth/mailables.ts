import { Mailable } from '../mail/mailable.js';

export interface VerifyEmailPayload {
  name: string | null | undefined;
  email: string;
  url: string;
  appName?: string;
}

const VERIFY_TEMPLATE = `<!doctype html>
<html><body style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:24px auto;color:#222;">
  <h2>Verify your email</h2>
  <p>Hi {{name}},</p>
  <p>Click the link below to confirm your email address for {{appName}}:</p>
  <p><a href="{{url}}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Verify email</a></p>
  <p style="color:#666;font-size:13px;">Or paste this URL into your browser: <br/><span style="word-break:break-all;">{{url}}</span></p>
  <p style="color:#666;font-size:13px;">If you didn't sign up, ignore this message.</p>
</body></html>
`;

export class VerifyEmailMail extends Mailable<VerifyEmailPayload> {
  override subject(p: VerifyEmailPayload): string {
    return `Verify your email${p.appName ? ` for ${p.appName}` : ''}`;
  }
  override async data(p: VerifyEmailPayload): Promise<Record<string, unknown>> {
    return {
      name: p.name ?? p.email,
      url: p.url,
      appName: p.appName ?? 'your account',
    };
  }
  override source(): string {
    return VERIFY_TEMPLATE;
  }
}

export interface ResetPasswordPayload {
  name: string | null | undefined;
  email: string;
  url: string;
  appName?: string;
}

const RESET_TEMPLATE = `<!doctype html>
<html><body style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:24px auto;color:#222;">
  <h2>Reset your password</h2>
  <p>Hi {{name}},</p>
  <p>We received a request to reset the password for your {{appName}} account.</p>
  <p><a href="{{url}}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Reset password</a></p>
  <p style="color:#666;font-size:13px;">Or paste this URL into your browser: <br/><span style="word-break:break-all;">{{url}}</span></p>
  <p style="color:#666;font-size:13px;">If you didn't request a reset, you can safely ignore this email — your password will not change.</p>
</body></html>
`;

export class ResetPasswordMail extends Mailable<ResetPasswordPayload> {
  override subject(p: ResetPasswordPayload): string {
    return `Reset your password${p.appName ? ` for ${p.appName}` : ''}`;
  }
  override async data(p: ResetPasswordPayload): Promise<Record<string, unknown>> {
    return {
      name: p.name ?? p.email,
      url: p.url,
      appName: p.appName ?? 'your account',
    };
  }
  override source(): string {
    return RESET_TEMPLATE;
  }
}
