import HTTP_STATUS from '../constants/http-status.js';
import logger from '../logger/logger.js';

/**
 * Express error middleware that normalizes operational and unexpected errors.
 *
 * @param {Error & {statusCode?: number, details?: object, isOperational?: boolean, retryAfterSeconds?: number}} error - Raised error.
 * @param {import('express').Request} _request - Incoming HTTP request.
 * @param {import('express').Response} response - Outgoing HTTP response.
 * @param {import('express').NextFunction} _next - Express callback.
 * @returns {void}
 */
export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const retryAfterSeconds = Math.ceil(Number(error.retryAfterSeconds));

  logger.error('HTTP request failed', { statusCode });

  if (
    statusCode === HTTP_STATUS.TOO_MANY_REQUESTS &&
    Number.isSafeInteger(retryAfterSeconds) &&
    retryAfterSeconds > 0
  ) {
    response.set('Retry-After', String(retryAfterSeconds));
  }

  response.status(statusCode).json({
    success: false,
    error: {
      message: error.isOperational
        ? error.message
        : statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR
          ? 'La requête est invalide.'
          : 'Internal server error',
      ...(error.isOperational && error.details ? { details: error.details } : {}),
    },
  });
}

/**
 * Converts unmatched endpoints into a consistent JSON 404 response.
 *
 * @param {import('express').Request} request - Incoming HTTP request.
 * @param {import('express').Response} response - Outgoing HTTP response.
 * @returns {void}
 */
export function notFoundHandler(_request, response) {
  response.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: { message: 'Route introuvable.' },
  });
}
