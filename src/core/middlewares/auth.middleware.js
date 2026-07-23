import jwt from 'jsonwebtoken';

import env from '../../config/env.js';
import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';

/** Validates a bearer access token and exposes its claims as request.user. */
export function authenticate(request, _response, next) {
  const token = request.headers.authorization?.startsWith('Bearer ')
    ? request.headers.authorization.slice(7)
    : null;
  if (!token) return next(new AppError('Authentication is required', HTTP_STATUS.UNAUTHORIZED));
  try {
    request.user = jwt.verify(token, env.jwt.secret);
    return next();
  } catch {
    return next(new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED));
  }
}
