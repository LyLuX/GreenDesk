import { validationResult } from 'express-validator';

import { createValidator } from '../src/modules/materials/validator/material.validator.js';

const validate = async (body) => {
  const request = { body };
  await Promise.all(createValidator.map((validator) => validator.run(request)));
  return validationResult(request).array();
};

describe('material validation', () => {
  it('accepts empty optional fields sent as null by the material form', async () => {
    await expect(
      validate({
        name: 'Tondeuse',
        brandUuid: '11111111-1111-4111-8111-111111111111',
        categoryUuid: '22222222-2222-4222-8222-222222222222',
        model: 'Pro 500',
        purchaseDate: '2026-07-01',
        commissionedAt: '2026-07-02',
        unit: 'unité',
        purchasePrice: 1200,
        serialNumber: null,
        retiredAt: null,
        notes: null,
      }),
    ).resolves.toEqual([]);
  });

  it('returns an explicit message for an invalid purchase date', async () => {
    await expect(
      validate({
        name: 'Tondeuse',
        unit: 'unité',
        purchasePrice: 1200,
        purchaseDate: 'date incorrecte',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        path: 'purchaseDate',
        msg: 'La date d’achat est invalide.',
      }),
    ]);
  });
});
