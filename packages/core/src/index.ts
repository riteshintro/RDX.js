import 'reflect-metadata';

export { Application } from './application.js';
export type { ProviderClass } from './application.js';
export { Container } from './container/container.js';
export { ConfigRepository } from './config/repository.js';
export type { ConfigData } from './config/repository.js';
export { ServiceProvider } from './providers/service-provider.js';
export { createLogger } from './logging/logger.js';
export type { Logger } from './logging/logger.js';
export { env, loadEnv } from './support/env.js';
export { app, config, logger } from './support/helpers.js';

export { Request, type RdxUploadedFile } from './http/request.js';
export { Response, type CookieOptions } from './http/response.js';
export { HttpKernel, type HttpKernelOptions } from './http/kernel.js';
export {
  type Middleware,
  type MiddlewareFn,
  type MiddlewareClass,
  type MiddlewareLike,
  type FastifyHookFn,
  type Next,
  defineMiddleware,
} from './http/middleware.js';
export { HttpServiceProvider } from './providers/http-service-provider.js';
export { RoutingServiceProvider } from './providers/routing-service-provider.js';

export { Route } from './routing/route.js';
export { Router, RouteBuilder } from './routing/router.js';
export { RouteCompiler } from './routing/compiler.js';

export { Model } from './database/model.js';
export type { AnyTable } from './database/model.js';
export { QueryBuilder } from './database/query.js';
export { HasMany, HasOne, BelongsTo } from './database/relations.js';
export { createPgConnection, type RdxDatabase, type DbConfig } from './database/connection.js';
export { DatabaseServiceProvider } from './providers/database-service-provider.js';

export { validate, zodErrorsToMap } from './validation/zod-validator.js';
export { FormRequest } from './validation/form-request.js';

export { createAuth, type RdxAuthOptions, type RdxAuthInstance, type CreateAuthArgs } from './auth/auth-config.js';
export { Auth } from './auth/auth-facade.js';
export { RequireAuth } from './auth/require-auth.js';
export {
  user as userTable,
  session as sessionTable,
  account as accountTable,
  verification as verificationTable,
  authSchema,
  AUTH_SCHEMA_SQL,
} from './auth/schema.js';
export { AuthServiceProvider } from './providers/auth-service-provider.js';
export {
  VerifyEmailMail,
  ResetPasswordMail,
  type VerifyEmailPayload,
  type ResetPasswordPayload,
} from './auth/mailables.js';

export { Scheduler, type ScheduledFn, type ScheduledTask, type ScheduledTaskOptions } from './scheduler/scheduler.js';
export { Schedule } from './scheduler/schedule.js';
export { SchedulerServiceProvider } from './providers/scheduler-service-provider.js';

export { Mailable, type RenderedMessage } from './mail/mailable.js';
export { Mailer, type MailConfig } from './mail/mailer.js';
export { Mail } from './mail/mail.js';
export { MailServiceProvider } from './providers/mail-service-provider.js';

export {
  Upload,
  uploadSingle,
  uploadArray,
  uploadFields,
  uploadAny,
  type UploadOptions,
  type UploadField,
  type UploadedFile,
} from './uploads/uploads.js';

export type {
  HttpMethod,
  RouteDef,
  RouteHandler,
  RouteHandlerFn,
  ControllerCtor,
  ControllerAction,
  GroupAttributes,
} from './routing/route-definition.js';
export {
  HttpException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ValidationException,
} from './exceptions/http-exception.js';
