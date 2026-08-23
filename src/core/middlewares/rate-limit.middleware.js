import { rateLimit } from 'express-rate-limit';

import env from '../../config/env.js';
import HTTP_STATUS from '../constants/http-status.js';
import logger from '../logger/logger.js';

const disabledLimiter = (_request, _response, next) => next();

const limiterOptions = ({
  identifier,
  message,
  windowMs,
  limit,
  securityLogger,
  keyGenerator,
  skipSuccessfulRequests = false,
}) => ({
  identifier,
  message,
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  passOnStoreError: false,
  skipSuccessfulRequests,
  ...(keyGenerator ? { keyGenerator } : { ipv6Subnet: 56 }),
  handler(request, response, _next, options) {
    securityLogger.warn('Rate limit exceeded', {
      event: 'security.rate_limit_exceeded',
      policy: identifier,
      requestId: request.id,
      ip: request.ip,
      method: request.method,
      path: request.path,
    });
    response.status(options.statusCode ?? HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: { message },
    });
  },
});

/** Builds independent quotas so public authentication routes cannot exhaust one another. */
export function createRateLimiters(configuration = env.rateLimit, securityLogger = logger) {
  if (!configuration.enabled) {
    return {
      apiRateLimiter: disabledLimiter,
      loginRateLimiter: disabledLimiter,
      registerRateLimiter: disabledLimiter,
      refreshRateLimiter: disabledLimiter,
      emailVerificationRateLimiter: disabledLimiter,
    };
  }

  return {
    apiRateLimiter: rateLimit(
      limiterOptions({
        ...configuration.api,
        identifier: 'api',
        message: 'Trop de requêtes. Réessayez plus tard.',
        securityLogger,
      }),
    ),
    loginRateLimiter: rateLimit(
      limiterOptions({
        ...configuration.login,
        identifier: 'auth-login',
        message: 'Trop de tentatives de connexion. Réessayez plus tard.',
        securityLogger,
        skipSuccessfulRequests: true,
      }),
    ),
    registerRateLimiter: rateLimit(
      limiterOptions({
        ...configuration.register,
        identifier: 'auth-register',
        message: 'Trop de créations de compte. Réessayez plus tard.',
        securityLogger,
      }),
    ),
    refreshRateLimiter: rateLimit(
      limiterOptions({
        ...configuration.refresh,
        identifier: 'auth-refresh',
        message: 'Trop de renouvellements de session. Réessayez plus tard.',
        securityLogger,
        keyGenerator: (request) => `user:${request.user.sub}`,
      }),
    ),
    emailVerificationRateLimiter: rateLimit(
      limiterOptions({
        ...configuration.emailVerification,
        identifier: 'auth-email-verification',
        message: 'Trop de tentatives de vérification. Réessayez plus tard.',
        securityLogger,
      }),
    ),
  };
}

export const {
  apiRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  refreshRateLimiter,
  emailVerificationRateLimiter,
} = createRateLimiters();
