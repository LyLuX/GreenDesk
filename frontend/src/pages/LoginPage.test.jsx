import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext.jsx';

vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: vi.fn() }),
}));

import LoginPage from './LoginPage.jsx';

describe('LoginPage', () => {
  afterEach(cleanup);

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
});
