import HTTP_STATUS from '../constants/http-status.js';

/**
 * Operational error that can be safely translated into an API response.
 */
export default class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {number} [statusCode=500] - HTTP response status.
   * @param {object} [details] - Optional error context for clients.
   */
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
