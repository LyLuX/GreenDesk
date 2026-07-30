import jwt from 'jsonwebtoken';

import env from '../../config/env.js';
import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';
import AuthRepository from '../../modules/auth/repository/auth.repository.js';

/** Validates a bearer access token and exposes its claims as request.user. */
export function createAuthenticate(authRepository = new AuthRepository()) {
  return async function authenticateRequest(request, _response, next) {
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
    if (
      (await authRepository.isAccessTokenRevoked(claims.jti)) ||
      !(await authRepository.isActiveUser(claims.userId, claims.sub))
    ) {
      return next(new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED));
    }
    request.user = claims;
    return next();
  };
}

export const authenticate = createAuthenticate();
