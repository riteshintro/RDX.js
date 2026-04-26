export class HttpException extends Error {
  readonly status: number;
  readonly headers: Record<string, string>;

  constructor(status: number, message?: string, headers: Record<string, string> = {}) {
    super(message ?? `HTTP ${status}`);
    this.name = 'HttpException';
    this.status = status;
    this.headers = headers;
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Not Found') {
    super(404, message);
    this.name = 'NotFoundException';
  }
}

export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request') {
    super(400, message);
    this.name = 'BadRequestException';
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedException';
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenException';
  }
}

export class ValidationException extends HttpException {
  readonly errors: Record<string, string[]>;
  constructor(errors: Record<string, string[]>, message = 'The given data was invalid.') {
    super(422, message);
    this.name = 'ValidationException';
    this.errors = errors;
  }
}
