import type { FastifyRequest } from 'fastify';
import type { preHandlerAsyncHookHandler } from 'fastify';
import { BadRequestException, ValidationException } from '../exceptions/http-exception.js';
import type { RdxUploadedFile } from '../http/request.js';

export interface UploadOptions {
  maxFileSize?: number;
  maxFiles?: number;
  fileFilter?: (file: { fieldname: string; mimetype: string; filename: string }) => boolean | Promise<boolean>;
}

export interface UploadField {
  name: string;
  maxCount?: number;
}

interface MultipartPart {
  type: 'file' | 'field';
  fieldname: string;
  filename?: string;
  mimetype?: string;
  toBuffer(): Promise<Buffer>;
  value?: unknown;
}

interface MultipartCapableRequest {
  isMultipart(): boolean;
  parts(): AsyncIterable<MultipartPart>;
}

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_FILES = 10;

async function consumeMultipart(
  req: FastifyRequest,
  opts: UploadOptions,
): Promise<{ files: RdxUploadedFile[]; body: Record<string, unknown> }> {
  const mreq = req as unknown as MultipartCapableRequest;
  if (typeof mreq.isMultipart !== 'function') {
    throw new Error(
      '@fastify/multipart not registered. Call kernel.register(multipart) at boot, or it is auto-registered when an upload middleware is used.',
    );
  }
  if (!mreq.isMultipart()) {
    throw new BadRequestException('Expected multipart/form-data');
  }

  const maxFileSize = opts.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;

  const files: RdxUploadedFile[] = [];
  const body: Record<string, unknown> = {};

  for await (const part of mreq.parts()) {
    if (part.type === 'file' && part.filename) {
      if (files.length >= maxFiles) {
        throw new ValidationException({ files: [`Too many files (max ${maxFiles})`] });
      }
      if (opts.fileFilter) {
        const allowed = await opts.fileFilter({
          fieldname: part.fieldname,
          mimetype: part.mimetype ?? 'application/octet-stream',
          filename: part.filename,
        });
        if (!allowed) continue;
      }
      const buffer = await part.toBuffer();
      if (buffer.byteLength > maxFileSize) {
        throw new ValidationException({
          [part.fieldname]: [`File exceeds max size of ${maxFileSize} bytes`],
        });
      }
      files.push({
        fieldname: part.fieldname,
        originalname: part.filename,
        mimetype: part.mimetype ?? 'application/octet-stream',
        size: buffer.byteLength,
        buffer,
      });
    } else if (part.type === 'field') {
      body[part.fieldname] = part.value;
    }
  }

  return { files, body };
}

function attach(req: FastifyRequest, files: RdxUploadedFile[], body: Record<string, unknown>): void {
  const r = req as unknown as { _files?: RdxUploadedFile[]; _file?: RdxUploadedFile; body?: unknown };
  r._files = files;
  r._file = files[0];
  if (Object.keys(body).length > 0) {
    if (r.body && typeof r.body === 'object') {
      r.body = { ...(r.body as object), ...body };
    } else {
      r.body = body;
    }
  }
}

export function uploadSingle(field: string, opts: UploadOptions = {}): preHandlerAsyncHookHandler {
  return async (req) => {
    const { files, body } = await consumeMultipart(req, { ...opts, maxFiles: 1 });
    const onlyMatching = files.filter((f) => f.fieldname === field);
    if (onlyMatching.length === 0) {
      attach(req, [], body);
      return;
    }
    attach(req, [onlyMatching[0]!], body);
  };
}

export function uploadArray(field: string, maxCount = DEFAULT_MAX_FILES, opts: UploadOptions = {}): preHandlerAsyncHookHandler {
  return async (req) => {
    const { files, body } = await consumeMultipart(req, { ...opts, maxFiles: maxCount });
    const matching = files.filter((f) => f.fieldname === field);
    if (matching.length > maxCount) {
      throw new ValidationException({ [field]: [`Too many files for "${field}" (max ${maxCount})`] });
    }
    attach(req, matching, body);
  };
}

export function uploadFields(fields: UploadField[], opts: UploadOptions = {}): preHandlerAsyncHookHandler {
  const maxByField = new Map(fields.map((f) => [f.name, f.maxCount ?? DEFAULT_MAX_FILES]));
  const total = fields.reduce((s, f) => s + (f.maxCount ?? DEFAULT_MAX_FILES), 0);
  return async (req) => {
    const { files, body } = await consumeMultipart(req, { ...opts, maxFiles: total });
    for (const [name, max] of maxByField) {
      const count = files.filter((f) => f.fieldname === name).length;
      if (count > max) {
        throw new ValidationException({ [name]: [`Too many files for "${name}" (max ${max})`] });
      }
    }
    const allowedNames = new Set(maxByField.keys());
    const filtered = files.filter((f) => allowedNames.has(f.fieldname));
    attach(req, filtered, body);
  };
}

export function uploadAny(opts: UploadOptions = {}): preHandlerAsyncHookHandler {
  return async (req) => {
    const { files, body } = await consumeMultipart(req, opts);
    attach(req, files, body);
  };
}

export const Upload = {
  single: uploadSingle,
  array: uploadArray,
  fields: uploadFields,
  any: uploadAny,
} as const;

export type UploadedFile = RdxUploadedFile;
