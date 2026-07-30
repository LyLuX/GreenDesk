import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext.jsx';
import client from '../api/client.js';
import RegisterPage from './RegisterPage.jsx';

vi.mock('../api/client.js', () => ({ default: { post: vi.fn() } }));

function renderPage() {
  return render(
    <AuthContext.Provider value={{ isAuthenticated: false }}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('submits the expected registration payload', async () => {
    const user = userEvent.setup();
    client.post.mockResolvedValue({ data: { success: true } });
    renderPage();

    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Durand');
    await user.type(screen.getByLabelText('Email'), 'marie@example.test');
    await user.type(screen.getByLabelText('Mot de passe'), 'Password123');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(client.post).toHaveBeenCalledWith('/v1/auth/register', {
      firstName: 'Marie',
      lastName: 'Durand',
      email: 'marie@example.test',
      password: 'Password123',
    });
  });

  it('rejects mismatched passwords before calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Durand');
    await user.type(screen.getByLabelText('Email'), 'marie@example.test');
    await user.type(screen.getByLabelText('Mot de passe'), 'Password123');
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'Password456');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Les mots de passe ne correspondent pas.',
    );
    expect(client.post).not.toHaveBeenCalled();
  });

  it('shows each password temporarily from its own icon button', async () => {
    const user = userEvent.setup();
    renderPage();

    const password = screen.getByLabelText('Mot de passe');
    const confirmation = screen.getByLabelText('Confirmer le mot de passe');
    const toggles = screen.getAllByRole('button', { name: 'Afficher le mot de passe' });

    expect(password).toHaveAttribute('type', 'password');
    expect(confirmation).toHaveAttribute('type', 'password');
    expect(toggles).toHaveLength(2);

    await user.click(toggles[0]);
    expect(password).toHaveAttribute('type', 'text');
    expect(confirmation).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Masquer le mot de passe' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
