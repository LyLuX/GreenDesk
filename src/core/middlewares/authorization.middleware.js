import HTTP_STATUS from '../constants/http-status.js';
import AppError from '../errors/app-error.js';

/** Checks whether a request carries at least one required permission. */
export const hasPermission = (request, ...permissions) =>
  permissions.some((permission) => request.user?.permissions?.includes(permission));

/** Requires at least one permission embedded in the authenticated JWT. */
export const authorize =
  (...permissions) =>
  (request, _response, next) => {
    if (hasPermission(request, ...permissions)) return next();
    return next(new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN));
  };

/** Requires every listed permission. */
export const authorizeAll =
  (...permissions) =>
  (request, _response, next) => {
    if (permissions.every((permission) => hasPermission(request, permission))) return next();
    return next(new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN));
  };

/** Requires the permissions mapped to every field present in the validated request body. */
export const authorizeBodyFields = (defaultPermission, fieldPermissions = {}) => {
  return (request, response, next) => {
    const requiredPermissions = new Set();
    for (const field of Object.keys(request.body ?? {})) {
      const permission = fieldPermissions[field] ?? defaultPermission;
      if (permission) requiredPermissions.add(permission);
    }
    if (!requiredPermissions.size && defaultPermission) requiredPermissions.add(defaultPermission);
    if (!requiredPermissions.size) return next();
    return authorizeAll(...requiredPermissions)(request, response, next);
  };
};
