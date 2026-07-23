import { validationResult } from 'express-validator';

import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';

/**
 * Turns express-validator failures into centralized application errors.
 *
 * @param {import('express').Request} request - Incoming request.
 * @param {import('express').Response} _response - Outgoing response.
 * @param {import('express').NextFunction} next - Express callback.
 * @returns {void}
 */
export function validateRequest(request, _response, next) {
  const errors = validationResult(request);

  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', HTTP_STATUS.BAD_REQUEST, errors.array()));
  }

  return next();
}
