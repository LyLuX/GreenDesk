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
    const details = errors.array({ onlyFirstError: true });
    const messages = [
      ...new Set(
        details.map((error) =>
          error.msg === 'Invalid value'
            ? `Le champ « ${error.path} » contient une valeur invalide.`
            : error.msg,
        ),
      ),
    ];
    return next(new AppError(messages.join(' '), HTTP_STATUS.BAD_REQUEST, details));
  }

  return next();
}
