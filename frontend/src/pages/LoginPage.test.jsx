import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext.jsx';
import { rememberReturnLocation } from '../auth/return-location.js';

vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: vi.fn() }),
}));

import LoginPage from './LoginPage.jsx';

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
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
    expect(await screen.findByText('/maintenance/parts?stockStatus=LOW#inventory')).toBeVisible();
    expect(sessionStorage.getItem('greendesk.returnLocation')).toBeNull();
  });
});
