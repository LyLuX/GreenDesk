import { validationResult } from 'express-validator';

import { listValidator as maintenanceListValidator } from '../src/modules/maintenance/validator/maintenance.validator.js';
import { listValidator as materialListValidator } from '../src/modules/materials/validator/material.validator.js';

const validate = async (validators, query) => {
  const request = { query };
  await Promise.all(validators.map((validator) => validator.run(request)));
  return validationResult(request).array();
};

describe('list filter validation', () => {
  it('accepts cleared material filters', async () => {
    await expect(
      validate(materialListValidator, {
        active: '',
        manufacturerUuid: '',
        categoryUuid: '',
        search: '',
      }),
    ).resolves.toEqual([]);
  });

  it('accepts every cleared maintenance filter', async () => {
    await expect(
      validate(maintenanceListValidator, {
        search: '',
        materialUuid: '',
        priority: '',
        maintenanceType: '',
        status: '',
        active: '',
        overdue: '',
        upcoming: '',
      }),
    ).resolves.toEqual([]);
  });

  it('accepts the complete-list pagination value', async () => {
    await expect(validate(materialListValidator, { limit: 'all' })).resolves.toEqual([]);
    await expect(validate(maintenanceListValidator, { limit: 'all' })).resolves.toEqual([]);
  });
});
