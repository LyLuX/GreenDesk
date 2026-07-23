import { v4 as uuidv4 } from 'uuid';

/**
 * Adds a unique ID to each request and returns it in the response headers.
 *
 * @param {import('express').Request} request - Incoming HTTP request.
 * @param {import('express').Response} response - Outgoing HTTP response.
 * @param {import('express').NextFunction} next - Express callback.
 * @returns {void}
 */
export function requestId(request, response, next) {
  request.id = request.header('x-request-id') ?? uuidv4();
  response.setHeader('x-request-id', request.id);
  next();
}
