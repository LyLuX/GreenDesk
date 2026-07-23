export function decodeJwtPayload(token) {
  try {
    const payload = token?.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}
export function isJwtExpired(token, marginSeconds = 20) {
  const payload = decodeJwtPayload(token);
  return !payload?.exp || payload.exp <= Math.floor(Date.now() / 1000) + marginSeconds;
}
