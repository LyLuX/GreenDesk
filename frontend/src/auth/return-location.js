export const RETURN_LOCATION_STORAGE_KEY = 'greendesk.returnLocation';

const excludedPaths = new Set(['/login', '/register', '/verify-email']);

/** Accepts only rooted, same-origin GreenDesk paths that can be resumed after login. */
export const sanitizeReturnLocation = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin || excludedPaths.has(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const rememberReturnLocation = (value) => {
  const safeLocation = sanitizeReturnLocation(value);
  if (!safeLocation) return false;
  try {
    sessionStorage.setItem(RETURN_LOCATION_STORAGE_KEY, safeLocation);
    return true;
  } catch {
    return false;
  }
};

export const rememberCurrentReturnLocation = () =>
  rememberReturnLocation(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );

export const readReturnLocation = () => {
  try {
    const safeLocation = sanitizeReturnLocation(
      sessionStorage.getItem(RETURN_LOCATION_STORAGE_KEY),
    );
    if (!safeLocation) sessionStorage.removeItem(RETURN_LOCATION_STORAGE_KEY);
    return safeLocation;
  } catch {
    return null;
  }
};

export const clearReturnLocation = () => {
  try {
    sessionStorage.removeItem(RETURN_LOCATION_STORAGE_KEY);
  } catch {
    // Navigation falls back to the dashboard when storage is unavailable.
  }
};

/** Resolves the preferred router destination without clearing it during a React render. */
export const resolveReturnLocation = (preferredLocation, fallback = '/dashboard') =>
  sanitizeReturnLocation(preferredLocation) ??
  readReturnLocation() ??
  sanitizeReturnLocation(fallback) ??
  '/dashboard';
