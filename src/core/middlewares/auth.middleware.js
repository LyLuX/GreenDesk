import jwt from 'jsonwebtoken';

import env from '../../config/env.js';
import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';
import AuthRepository from '../../modules/auth/repository/auth.repository.js';

/** MySQL returns unsigned BIGINT identities as decimal strings beyond Number precision. */
const hasUserId = (value) =>
  (Number.isSafeInteger(value) && value > 0) ||
  (typeof value === 'string' &&
    /^[1-9]\d{0,19}$/.test(value) &&
    BigInt(value) <= 18446744073709551615n);

/** Only complete server-issued identity and authorization claims can form a session. */
const hasAccessTokenClaims = (claims) =>
  claims &&
  typeof claims === 'object' &&
  typeof claims.sub === 'string' &&
  claims.sub.length > 0 &&
  hasUserId(claims.userId) &&
  typeof claims.jti === 'string' &&
  claims.jti.length > 0 &&
  Number.isSafeInteger(claims.exp) &&
  claims.exp > 0 &&
  Number.isSafeInteger(claims.authorizationVersion) &&
  claims.authorizationVersion >= 0 &&
  Array.isArray(claims.permissions) &&
  claims.permissions.every((permission) => typeof permission === 'string');

/** Validates a bearer access token and exposes its claims as request.user. */
export function createAuthenticate(authRepository = new AuthRepository()) {
  return async function authenticateRequest(request, _response, next) {
    const authorization = request.headers.authorization;
    const token =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : null;
    if (!token) return next(new AppError('Authentication is required', HTTP_STATUS.UNAUTHORIZED));
    let claims;
    try {
      claims = jwt.verify(token, env.jwt.secret);
    } catch {
      return next(new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED));
    }
    if (!hasAccessTokenClaims(claims)) {
      return next(new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED));
    }
    if (
      (await authRepository.isAccessTokenRevoked(claims.jti)) ||
      !(await authRepository.isActiveUser(claims.userId, claims.sub, claims.authorizationVersion))
    ) {
      return next(new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED));
    }
    request.user = claims;
    return next();
  };
}

export const authenticate = createAuthenticate();
