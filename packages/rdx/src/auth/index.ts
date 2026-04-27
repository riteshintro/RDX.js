export { createAuth, type RdxAuthOptions, type RdxAuthInstance, type CreateAuthArgs } from './auth-config.js';
export { Auth } from './auth-facade.js';
export { RequireAuth } from './require-auth.js';
export {
  user as userTable,
  session as sessionTable,
  account as accountTable,
  verification as verificationTable,
  authSchema,
  AUTH_SCHEMA_SQL,
} from './schema.js';
export {
  VerifyEmailMail,
  ResetPasswordMail,
  type VerifyEmailPayload,
  type ResetPasswordPayload,
} from './mailables.js';
