import env from '../../../config/env.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';

/** Rejects public account creation unless the deployment explicitly enables it. */
export const createPublicRegistrationGuard = (enabled = env.auth.publicRegistrationEnabled) =>
  function publicRegistrationGuard(_request, _response, next) {
    if (enabled) return next();
    return next(new AppError('L’inscription publique est désactivée.', HTTP_STATUS.FORBIDDEN));
  };

export const requirePublicRegistration = createPublicRegistrationGuard();
