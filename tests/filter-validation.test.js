import { validationResult } from 'express-validator';

import { updateValidator as categoryUpdateValidator } from '../src/modules/categories/validator/category.validator.js';
import { listValidator as maintenanceListValidator } from '../src/modules/maintenance/validator/maintenance.validator.js';
import {
  listValidator as materialListValidator,
  updateValidator as materialUpdateValidator,
} from '../src/modules/materials/validator/material.validator.js';
import { updateValidator as manufacturerUpdateValidator } from '../src/modules/manufacturers/validator/manufacturer.validator.js';
import { updateValidator as supplierUpdateValidator } from '../src/modules/suppliers/validator/supplier.validator.js';

const validate = async (validators, query) => {
  const request = { query };
  await Promise.all(validators.map((validator) => validator.run(request)));
  return validationResult(request).array();
};

const validateStatusUpdate = async (validators) => {
  const request = {
    params: { uuid: 'f75ce638-18d2-4e29-9958-2afaa4ae5151' },
    body: { active: false },
  };
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

  it.each([
    ['materials', materialUpdateValidator],
    ['categories', categoryUpdateValidator],
    ['manufacturers', manufacturerUpdateValidator],
    ['suppliers', supplierUpdateValidator],
  ])('accepts a boolean active status in %s updates', async (_resource, validators) => {
    await expect(validateStatusUpdate(validators)).resolves.toEqual([]);
  });
});
