import HTTP_STATUS from '../constants/http-status.js';

/**
 * Operational error that can be safely translated into an API response.
 */
export default class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {number} [statusCode=500] - HTTP response status.
   * @param {object} [details] - Optional error context for clients.
   * @param {{retryAfterSeconds?: number}} [responseOptions] - Optional safe response metadata.
   */
  constructor(
    message,
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details,
    responseOptions = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.retryAfterSeconds = responseOptions.retryAfterSeconds;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
