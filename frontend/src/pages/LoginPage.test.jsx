import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, AuthProvider } from '../auth/AuthContext.jsx';
import { rememberReturnLocation } from '../auth/return-location.js';
import { saveSession } from '../auth/auth.storage.js';

const mocks = vi.hoisted(() => ({ post: vi.fn(), notify: vi.fn() }));

vi.mock('../api/client.js', () => ({
  default: { post: mocks.post },
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: mocks.notify }),
}));

import LoginPage from './LoginPage.jsx';
import { rememberSecurityLogout, SECURITY_LOGOUT_MESSAGE } from '../auth/security-logout.js';

describe('LoginPage', () => {
  it('notifies after authentication initialization discovers an expired session', async () => {
    saveSession({
      accessToken: `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`,
      user: { roles: [], permissions: [] },
    });
    render(
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeVisible();
    expect(mocks.notify).toHaveBeenCalledWith('info', SECURITY_LOGOUT_MESSAGE);
  });
  it('shows the security notification once after a reload', () => {
    rememberSecurityLogout();
    const renderLogin = () => (
      <AuthContext.Provider value={{ isAuthenticated: false, isInitializing: false }}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    const { unmount } = render(renderLogin());
    expect(mocks.notify).toHaveBeenCalledWith('info', SECURITY_LOGOUT_MESSAGE);
    unmount();
    render(renderLogin());
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('does not repeat the product name already displayed in the logo', () => {
    render(
      <AuthContext.Provider value={{ isAuthenticated: false, login: vi.fn() }}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('img', { name: 'Logo GreenDesk' })).toHaveClass('mb-2');
    expect(screen.queryByRole('heading', { name: 'GreenDesk' })).not.toBeInTheDocument();
  });

  it('temporarily reveals the password from an accessible icon button', async () => {
    const user = userEvent.setup();
    render(
      <AuthContext.Provider value={{ isAuthenticated: false, login: vi.fn() }}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    const password = screen.getByLabelText('Mot de passe');
    expect(password).toHaveAttribute('type', 'password');
    expect(password.closest('.input-group')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Afficher le mot de passe' })).toHaveClass(
      'btn',
      'btn-outline-secondary',
    );

    await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));

    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Masquer le mot de passe' })).toBeVisible();
  });

  it('returns to the persisted page after a successful login', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ user: { firstName: 'Ada' } });
    rememberReturnLocation('/maintenance/parts?stockStatus=LOW#inventory');

    function Destination() {
      const location = useLocation();
      return <p>{`${location.pathname}${location.search}${location.hash}`}</p>;
    }

    render(
      <AuthContext.Provider value={{ isAuthenticated: false, login }}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/maintenance/parts" element={<Destination />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await user.type(screen.getByLabelText('Email'), 'ada@greendesk.local');
    await user.type(screen.getByLabelText('Mot de passe'), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(login).toHaveBeenCalledWith('ada@greendesk.local', 'SecurePass123!');
    expect(mocks.notify).toHaveBeenCalledWith(
      'success',
      'Bienvenue Ada, vous êtes maintenant connecté.',
    );
    expect(await screen.findByText('/maintenance/parts?stockStatus=LOW#inventory')).toBeVisible();
    expect(sessionStorage.getItem('greendesk.returnLocation')).toBeNull();
  });

  it('keeps the persisted destination when authentication state becomes active', async () => {
    const user = userEvent.setup();
    rememberReturnLocation('/maintenance/parts?stockStatus=LOW#inventory');
    mocks.post.mockResolvedValue({
      data: {
        data: {
          accessToken: 'access-token',
          user: { firstName: 'Ada', roles: [], permissions: [] },
        },
      },
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<p>Tableau de bord</p>} />
            <Route path="/maintenance/parts" element={<p>Pièces de maintenance</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await user.type(await screen.findByLabelText('Email'), 'ada@greendesk.local');
    await user.type(screen.getByLabelText('Mot de passe'), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Pièces de maintenance')).toBeVisible();
    expect(screen.queryByText('Tableau de bord')).not.toBeInTheDocument();
  });
});
