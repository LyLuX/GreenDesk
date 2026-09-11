import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthContext } from './AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import { readReturnLocation } from './return-location.js';
import { rememberSecurityLogout } from './security-logout.js';

function LoginDestination() {
  const location = useLocation();
  return (
    <>
      <p>{location.state?.from ?? 'Aucune destination'}</p>
      <p>{location.state?.notification?.message ?? 'Aucun avertissement'}</p>
    </>
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('remembers the complete protected URL before redirecting to login', async () => {
    render(
      <AuthContext.Provider
        value={{ isAuthenticated: false, isInitializing: false, isLoggingOut: false }}
      >
        <MemoryRouter initialEntries={['/maintenance/parts?stockStatus=LOW#inventory']}>
          <Routes>
            <Route path="/login" element={<LoginDestination />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/maintenance/parts" element={<p>Pièces</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const destination = '/maintenance/parts?stockStatus=LOW#inventory';
    expect(await screen.findByText(destination)).toBeVisible();
    expect(screen.getByText('Vous devez être connecté pour accéder à cette page.')).toBeVisible();
    await waitFor(() => expect(readReturnLocation()).toBe(destination));
  });

  it('does not treat a security logout as an unauthenticated link visit', async () => {
    rememberSecurityLogout();
    render(
      <AuthContext.Provider value={{ isAuthenticated: false, isInitializing: false }}>
        <MemoryRouter initialEntries={['/maintenance/parts']}>
          <Routes>
            <Route path="/login" element={<LoginDestination />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/maintenance/parts" element={<p>Pièces</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(await screen.findByText('Aucune destination')).toBeVisible();
    expect(screen.getByText('Aucun avertissement')).toBeVisible();
    expect(readReturnLocation()).toBeNull();
  });
});
