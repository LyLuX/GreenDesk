export const SESSION_STORAGE_KEY = 'greendesk.session';
export const readSession = () => {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY));
    if (
      !value?.accessToken ||
      !value?.user ||
      !Array.isArray(value.user.roles) ||
      !Array.isArray(value.user.permissions)
    ) {
      clearSession();
      return null;
    }
    return value;
  } catch {
    clearSession();
    return null;
  }
};
export const saveSession = (session) =>
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
export const clearSession = () => localStorage.removeItem(SESSION_STORAGE_KEY);
export const getAccessToken = () => readSession()?.accessToken ?? null;
