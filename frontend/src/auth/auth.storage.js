const KEY = 'greendesk.session';
export const readSession = () => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
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
export const saveSession = (session) => localStorage.setItem(KEY, JSON.stringify(session));
export const clearSession = () => localStorage.removeItem(KEY);
export const getAccessToken = () => readSession()?.accessToken ?? null;
