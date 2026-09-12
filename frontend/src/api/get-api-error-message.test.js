import { describe, expect, it } from 'vitest';

import getApiErrorMessage from './get-api-error-message.js';

describe('getApiErrorMessage', () => {
  it.each([
    [404, 'Material not found', 'Matériel introuvable.'],
    [409, 'Email is already in use', 'Cette adresse email est déjà utilisée.'],
    [409, 'Category name is already in use', 'Ce nom de catégorie est déjà utilisé.'],
    [403, 'Insufficient permissions', 'Vous n’avez pas l’autorisation pour cette action.'],
    [500, 'Internal server error', 'Une erreur serveur est survenue.'],
  ])(
    'displays the legacy API error %s / %s in French without changing the response',
    (status, message, expected) => {
      const error = { response: { status, data: { error: { message } } } };
      expect(getApiErrorMessage(error)).toBe(expected);
      expect(error.response.data.error.message).toBe(message);
    },
  );

  it('preserves precise French errors and unknown messages', () => {
    for (const message of [
      'Une pièce associée au plan est introuvable.',
      'Erreur métier spécifique',
      'toString',
    ]) {
      expect(getApiErrorMessage({ response: { status: 409, data: { error: { message } } } })).toBe(
        message,
      );
    }
  });

  it('provides a French fallback for validation failures without details', () => {
    expect(
      getApiErrorMessage({
        response: { status: 400, data: { error: { message: 'Validation failed' } } },
      }),
    ).toBe('Les données saisies sont invalides.');
  });

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
