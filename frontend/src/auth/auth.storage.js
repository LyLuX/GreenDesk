const KEY = 'greendesk.session';
export const readSession = () => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return value?.accessToken && value?.user ? value : null;
  } catch {
    return null;
  }
};
export const saveSession = (session) => localStorage.setItem(KEY, JSON.stringify(session));
export const clearSession = () => localStorage.removeItem(KEY);
export const getAccessToken = () => readSession()?.accessToken ?? null;
