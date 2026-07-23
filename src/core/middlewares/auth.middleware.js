import jwt from 'jsonwebtoken';

import env from '../../config/env.js';
import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';
import AuthRepository from '../../modules/auth/repository/auth.repository.js';

const authRepository = new AuthRepository();

/** Validates a bearer access token and exposes its claims as request.user. */
export async function authenticate(request, _response, next) {
  const token = request.headers.authorization?.startsWith('Bearer ')
    ? request.headers.authorization.slice(7)
    : null;
  if (!token) return next(new AppError('Authentication is required', HTTP_STATUS.UNAUTHORIZED));
  let claims;
  try {
    claims = jwt.verify(token, env.jwt.secret);
  } catch {
    return next(new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED));
  }
  if (await authRepository.isAccessTokenRevoked(claims.jti)) {
    return next(new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED));
  }
  request.user = claims;
  return next();
}
