import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let error = err;

  // Normalise common library errors into ApiError
  if (err?.name === 'CastError') error = ApiError.badRequest(`Invalid value for ${err.path}`);
  else if (err?.name === 'ValidationError')
    error = ApiError.badRequest('Validation failed', Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })));
  else if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`A record with this ${field} already exists`);
  } else if (err?.type === 'entity.parse.failed') error = ApiError.badRequest('Malformed JSON body');

  const status = error.status || 500;
  if (status >= 500 && !env.isTest) console.error(err);

  res.status(status).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status >= 500 && env.isProd ? 'Something went wrong' : error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}
