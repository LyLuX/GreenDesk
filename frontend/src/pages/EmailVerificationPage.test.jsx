import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '../auth/AuthContext.jsx';
import { resendEmailVerification, verifyEmail } from '../api/email-verification.api.js';
import EmailVerificationPage from './EmailVerificationPage.jsx';

vi.mock('../api/email-verification.api.js', () => ({
  verifyEmail: vi.fn(),
  resendEmailVerification: vi.fn(),
}));

const renderPage = (entry) =>
  render(
    <AuthContext.Provider value={{ isAuthenticated: false }}>
      <MemoryRouter initialEntries={[entry]}>
        <EmailVerificationPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('EmailVerificationPage', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('confirms the token supplied by the email link', async () => {
    verifyEmail.mockResolvedValue({ data: { success: true } });
    renderPage('/verify-email?token=opaque-token');

    await waitFor(() => expect(verifyEmail).toHaveBeenCalledWith('opaque-token'));
    expect(
      await screen.findByText(
        'Votre adresse email est vérifiée. Vous pouvez maintenant vous connecter.',
      ),
    ).toBeInTheDocument();
  });

  it('resends a verification message without disclosing account existence', async () => {
    const user = userEvent.setup();
    resendEmailVerification.mockResolvedValue({ data: { success: true } });
    renderPage({ pathname: '/verify-email', state: { email: 'marie@example.test' } });

    await user.click(screen.getByRole('button', { name: 'Renvoyer l’email de vérification' }));

    expect(resendEmailVerification).toHaveBeenCalledWith('marie@example.test');
    expect(
      await screen.findByText(
        'Si un compte non vérifié correspond à cette adresse, un nouvel email a été envoyé.',
      ),
    ).toBeInTheDocument();
  });

  it('reports when registration succeeded but the first email was not sent', () => {
    renderPage({
      pathname: '/verify-email',
      state: { email: 'marie@example.test', emailSent: false },
    });

    expect(
      screen.getByText(
        'Votre compte est créé, mais l’email de vérification n’a pas pu être envoyé.',
      ),
    ).toHaveClass('alert-danger');
  });

  it('shows the SMTP failure returned by a resend request', async () => {
    const user = userEvent.setup();
    resendEmailVerification.mockRejectedValue({
      response: {
        status: 503,
        data: { error: { message: 'Email delivery failed' } },
      },
    });
    renderPage({ pathname: '/verify-email', state: { email: 'marie@example.test' } });

    await user.click(screen.getByRole('button', { name: 'Renvoyer l’email de vérification' }));

    expect(
      await screen.findByText('L’email n’a pas pu être envoyé. Réessayez dans quelques instants.'),
    ).toHaveClass('alert-danger');
  });
});
