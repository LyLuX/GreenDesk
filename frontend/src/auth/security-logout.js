export const SECURITY_LOGOUT_MESSAGE = 'Vous avez été déconnecté pour des raisons de sécurité';
const pendingKey = 'greendesk.securityLogout.pending';
export const SECURITY_LOGOUT_REASON_KEY = 'greendesk.securityLogout.reason';

/** Keeps the message across a reload and shares the reason with other open tabs. */
export const rememberSecurityLogout = ({ broadcast = true } = {}) => {
  sessionStorage.setItem(pendingKey, 'true');
  if (broadcast) localStorage.setItem(SECURITY_LOGOUT_REASON_KEY, 'security');
};

export const consumeSecurityLogout = () => {
  const pending = sessionStorage.getItem(pendingKey) === 'true';
  sessionStorage.removeItem(pendingKey);
  return pending;
};

export const clearSecurityLogout = () => {
  sessionStorage.removeItem(pendingKey);
  localStorage.removeItem(SECURITY_LOGOUT_REASON_KEY);
};
