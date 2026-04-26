import multer, { type Multer, type Options as MulterOptions, type StorageEngine } from 'multer';
import type { RequestHandler } from 'express';

export interface UploadOptions {
  dest?: string;
  storage?: StorageEngine;
  limits?: MulterOptions['limits'];
  fileFilter?: MulterOptions['fileFilter'];
  preservePath?: boolean;
}

export interface UploadField {
  name: string;
  maxCount?: number;
}

const DEFAULT_LIMITS: MulterOptions['limits'] = {
  fileSize: 10 * 1024 * 1024,
  files: 10,
  fields: 100,
};

function build(opts: UploadOptions = {}): Multer {
  const cfg: MulterOptions = {
    limits: { ...DEFAULT_LIMITS, ...opts.limits },
    fileFilter: opts.fileFilter,
    preservePath: opts.preservePath,
  };
  if (opts.storage) cfg.storage = opts.storage;
  else if (opts.dest) cfg.dest = opts.dest;
  else cfg.storage = multer.memoryStorage();
  return multer(cfg);
}

export function uploadSingle(field: string, opts?: UploadOptions): RequestHandler {
  return build(opts).single(field);
}

export function uploadArray(field: string, maxCount = 10, opts?: UploadOptions): RequestHandler {
  return build(opts).array(field, maxCount);
}

export function uploadFields(fields: UploadField[], opts?: UploadOptions): RequestHandler {
  return build(opts).fields(fields);
}

export function uploadAny(opts?: UploadOptions): RequestHandler {
  return build(opts).any();
}

export function uploadNone(opts?: UploadOptions): RequestHandler {
  return build(opts).none();
}

export const Upload = {
  single: uploadSingle,
  array: uploadArray,
  fields: uploadFields,
  any: uploadAny,
  none: uploadNone,
  diskStorage: multer.diskStorage,
  memoryStorage: multer.memoryStorage,
} as const;

export type UploadedFile = Express.Multer.File;
