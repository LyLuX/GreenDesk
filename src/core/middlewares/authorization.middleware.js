import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';

/** Requires at least one permission embedded in the authenticated JWT. */
export const authorize =
  (...permissions) =>
  (request, _response, next) => {
    if (
      request.user?.roles?.includes('ADMIN') ||
      permissions.some((permission) => request.user?.permissions?.includes(permission))
    )
      return next();
    return next(new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN));
  };

/** Restricts an operation to one of the specified application roles. */
export const authorizeRole =
  (...roles) =>
  (request, _response, next) => {
    if (roles.some((role) => request.user?.roles?.includes(role))) return next();
    return next(new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN));
  };
