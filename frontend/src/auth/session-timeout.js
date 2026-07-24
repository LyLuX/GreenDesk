import { decodeJwtPayload } from './jwt.js';

export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const SESSION_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
export const ACTIVITY_THROTTLE_MS = 15 * 1000;

export const getLastActivityAt = (session, fallback = Date.now()) => {
  const value = Number(session?.lastActivityAt);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const isSessionInactive = (session, now = Date.now()) =>
  now - getLastActivityAt(session, now) >= SESSION_IDLE_TIMEOUT_MS;

export const getTokenRemainingMs = (token, now = Date.now()) => {
  const expiresAt = Number(decodeJwtPayload(token)?.exp) * 1000;
  return Number.isFinite(expiresAt) ? expiresAt - now : 0;
};

export const reloadApplication = () => window.location.reload();
