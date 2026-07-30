import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';

/** Checks whether a request carries at least one permission or the administrator role. */
export const hasPermission = (request, ...permissions) =>
  request.user?.roles?.includes('ADMIN') ||
  permissions.some((permission) => request.user?.permissions?.includes(permission));

/** Requires at least one permission embedded in the authenticated JWT. */
export const authorize =
  (...permissions) =>
  (request, _response, next) => {
    if (hasPermission(request, ...permissions)) return next();
    return next(new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN));
  };

/** Restricts an operation to one of the specified application roles. */
export const authorizeRole =
  (...roles) =>
  (request, _response, next) => {
    if (roles.some((role) => request.user?.roles?.includes(role))) return next();
    return next(new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN));
  };
