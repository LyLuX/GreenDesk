import { describe, expect, it } from 'vitest';

import getApiErrorMessage from './get-api-error-message.js';

describe('getApiErrorMessage', () => {
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
});
