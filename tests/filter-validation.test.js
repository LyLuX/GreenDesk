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
        brandUuid: '',
        categoryUuid: '',
        search: '',
      }),
    ).resolves.toEqual([]);
  });

  it('accepts every cleared maintenance filter', async () => {
    await expect(
      validate(maintenanceListValidator, {
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
});
