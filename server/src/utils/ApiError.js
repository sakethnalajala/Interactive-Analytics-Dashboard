export class ApiError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code || ApiError.codeFor(status);
    this.details = details;
  }

  static codeFor(status) {
    return (
      { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'RATE_LIMITED' }[status] ||
      'INTERNAL_ERROR'
    );
  }

  static badRequest(msg = 'Bad request', details) {
    return new ApiError(400, msg, { details });
  }
  static unauthorized(msg = 'Authentication required') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'You do not have permission to perform this action') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg);
  }
}
