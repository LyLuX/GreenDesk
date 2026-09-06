import env from '../../config/env.js';
import { getCompanyScope } from '../company/company-context.js';
import logger from './logger.js';

const logValue = (value, maxLength = 128) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value)
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .slice(0, maxLength)
    : null;

/** Bounded, process-local aggregation; never retains request bodies, tokens or full URLs. */
export function createAuthorizationDenialLogger({
  threshold = env.securityLogging.authorizationDenials.threshold,
  windowMs = env.securityLogging.authorizationDenials.windowMs,
  maxGroups = 10000,
  securityLogger = logger,
  now = Date.now,
} = {}) {
  const groups = new Map();

  return (request, { mode, permissions }) => {
    const timestamp = now();
    // Fixed windows keep insertion order equal to expiry order. No background timer is needed.
    for (const [key, group] of groups) {
      if (timestamp < group.expiresAt) break;
      groups.delete(key);
    }
    const userUuid = logValue(request.user?.sub);
    const userId = logValue(request.user?.userId);
    const companyUuid = logValue(getCompanyScope()?.companyUuid);
    const ip = logValue(request.ip, 64);
    const method = logValue(request.method, 16);
    // Express's registered template, not request.path/originalUrl (which contain user values).
    const route =
      typeof request.route?.path === 'string'
        ? logValue(`${request.baseUrl ?? ''}${request.route.path}`, 256)
        : 'unknown';
    const key = JSON.stringify([userUuid ?? userId ?? ip, companyUuid, method, route]);
    let group = groups.get(key);
    if (!group) {
      if (groups.size >= maxGroups) groups.delete(groups.keys().next().value);
      group = { count: 0, startedAt: timestamp, expiresAt: timestamp + windowMs };
      groups.set(key, group);
    }
    if (group.count >= threshold) return;
    group.count += 1;
    if (group.count !== threshold) return;

    securityLogger.warn('Repeated authorization denials', {
      event: 'security.authorization_denied_repeated',
      requestId: logValue(request.id),
      userUuid,
      userId,
      companyUuid,
      ip,
      method,
      route,
      statusCode: 403,
      authorizationMode: mode,
      requiredPermissions: [...new Set(permissions)].sort(),
      denialCount: group.count,
      threshold,
      windowMs,
      firstDeniedAt: new Date(group.startedAt).toISOString(),
    });
  };
}

export default createAuthorizationDenialLogger();
