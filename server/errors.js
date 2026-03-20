export class AppError extends Error {
  constructor(statusCode, message, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function badRequest(message, code = 'BAD_REQUEST') {
  return new AppError(400, message, code);
}

export function unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
  return new AppError(401, message, code);
}

export function forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
  return new AppError(403, message, code);
}

export function notFound(message = 'Not found', code = 'NOT_FOUND') {
  return new AppError(404, message, code);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  });
}
