import env from '../../config/env.js';
import { cacheControlPolicies, resolveCacheControl } from '../../config/cache.js';

/** Applies environment-aware cache headers before any route writes its response. */
export const createCacheControlMiddleware = (environment = env.nodeEnv) =>
  function cacheControl(request, response, next) {
    const cacheControlValue = resolveCacheControl({
      environment,
      method: request.method,
      path: request.path,
    });

    response.setHeader('Cache-Control', cacheControlValue);
    if (request.path.startsWith('/api/')) response.vary('Authorization');

    if (cacheControlValue === cacheControlPolicies.noStore) {
      delete request.headers['if-none-match'];
      delete request.headers['if-modified-since'];
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
      response.setHeader('Surrogate-Control', 'no-store');
    }

    next();
  };
