import { describe, expect, it } from 'vitest';

import getApiErrorMessage from './get-api-error-message.js';

describe('getApiErrorMessage', () => {
  it('translates invalid login credentials into French', () => {
    const error = {
      response: {
        status: 401,
        data: { error: { message: 'Invalid email or password' } },
      },
    };

    expect(getApiErrorMessage(error)).toBe('Adresse email ou mot de passe incorrect.');
  });

  it('uses validation details when an older API returns a generic message', () => {
    const error = {
      response: {
        status: 400,
        data: {
          error: {
            message: 'Validation failed',
            details: [{ path: 'purchaseDate', msg: 'La date d’achat est invalide.' }],
          },
        },
      },
    };

    expect(getApiErrorMessage(error)).toBe('La date d’achat est invalide.');
  });

  it('identifies the invalid field when no specific validation message is available', () => {
    const error = {
      response: {
        status: 400,
        data: {
          error: {
            message: 'Validation failed',
            details: [{ path: 'unit', msg: 'Invalid value' }],
          },
        },
      },
    };

    expect(getApiErrorMessage(error)).toBe('Le champ « unit » contient une valeur invalide.');
  });

  it('shows the remaining verification-email cooldown from Retry-After', () => {
    const error = {
      response: {
        status: 429,
        headers: { 'retry-after': '42' },
        data: { error: { message: 'Email verification resend cooldown active' } },
      },
    };

    expect(getApiErrorMessage(error)).toBe(
      'Un email vient déjà d’être envoyé. Réessayez dans 42 secondes.',
    );
  });
});
