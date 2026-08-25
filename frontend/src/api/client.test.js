import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_STORAGE_KEY } from '../auth/auth.storage.js';
import { RETURN_LOCATION_STORAGE_KEY } from '../auth/return-location.js';
import { ACTIVE_COMPANY_STORAGE_KEY } from '../auth/company.storage.js';
import client from './client.js';

describe('API client unauthorized responses', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('remembers the current page before clearing a server-invalidated session', async () => {
    const unauthorized = vi.fn();
    window.addEventListener('greendesk:unauthorized', unauthorized);
    window.history.replaceState({}, '', '/maintenance/parts?stockStatus=LOW#inventory');
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: 'access-token',
        user: { roles: [], permissions: [] },
      }),
    );

    const error = await client
      .get('/v1/maintenance-parts', {
        adapter: (config) => Promise.reject({ config, response: { status: 401 } }),
      })
      .catch((reason) => reason);

    expect(error.response.status).toBe(401);
    expect(sessionStorage.getItem(RETURN_LOCATION_STORAGE_KEY)).toBe(
      '/maintenance/parts?stockStatus=LOW#inventory',
    );
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(unauthorized).toHaveBeenCalledOnce();
    window.removeEventListener('greendesk:unauthorized', unauthorized);
  });

  it('sends the active company UUID with authenticated API requests', async () => {
    localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, 'company-uuid');
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: 'access-token', user: { roles: [], permissions: [] } }),
    );
    let sentConfig;

    await client.get('/v1/materials', {
      adapter: (config) => {
        sentConfig = config;
        return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
      },
    });

    expect(sentConfig.headers.Authorization).toBe('Bearer access-token');
    expect(sentConfig.headers['X-Company-Uuid']).toBe('company-uuid');
  });
});
