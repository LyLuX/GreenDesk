import { jest } from '@jest/globals';
import { Op } from 'sequelize';
import { validationResult } from 'express-validator';

import CategoryRepository from '../src/core/database/repositories/category.repository.js';
import Category from '../src/modules/categories/model/category.model.js';
import CompanyRepository from '../src/modules/companies/repository/company.repository.js';
import Company from '../src/modules/companies/model/company.model.js';
import MaterialRepository from '../src/modules/materials/repository/material.repository.js';
import Material from '../src/modules/materials/model/material.model.js';
import ManufacturerRepository from '../src/modules/manufacturers/repository/manufacturer.repository.js';
import Manufacturer from '../src/modules/manufacturers/model/part-manufacturer.model.js';
import SupplierRepository from '../src/modules/suppliers/repository/supplier.repository.js';
import Supplier from '../src/modules/suppliers/model/supplier.model.js';
import UserRepository from '../src/modules/users/repository/user.repository.js';
import User from '../src/modules/users/model/user.model.js';
import MaintenanceRepository from '../src/modules/maintenance/repository/maintenance.repository.js';
import MaintenanceTask from '../src/modules/maintenance/model/maintenance-task.model.js';
import MaintenanceCatalogRepository from '../src/modules/maintenance/repository/maintenance-catalog.repository.js';
import MaintenanceOperation from '../src/modules/maintenance/model/maintenance-operation.model.js';
import MaintenancePart from '../src/modules/maintenance/model/maintenance-part.model.js';
import { activeFilterValidator } from '../src/core/validators/active-filter.validator.js';

const collections = [
  ['categories', CategoryRepository, Category, 'findAll', 'active'],
  ['companies', CompanyRepository, Company, 'findAll', 'active'],
  ['manufacturers', ManufacturerRepository, Manufacturer, 'findAll', 'active'],
  ['suppliers', SupplierRepository, Supplier, 'findAll', 'active'],
  ['materials', MaterialRepository, Material, 'findAll', 'active'],
  ['material options', MaterialRepository, Material, 'findOptions', 'active'],
  ['users', UserRepository, User, 'findAll', 'isActive'],
  ['maintenance plans', MaintenanceRepository, MaintenanceTask, 'findAll', 'active'],
  [
    'maintenance operations',
    MaintenanceCatalogRepository,
    MaintenanceOperation,
    'findOperations',
    'active',
  ],
  ['maintenance parts', MaintenanceCatalogRepository, MaintenancePart, 'findParts', 'active'],
];

describe.each(collections)(
  '%s SQL list defaults',
  (_name, Repository, Model, method, activeField) => {
    afterEach(() => jest.restoreAllMocks());

    it.each([
      [undefined, true],
      ['true', true],
      [false, false],
      ['false', false],
      ['all', undefined],
    ])('applies active=%p before pagination', async (active, expected) => {
      const find = jest.spyOn(Model, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
      await new Repository()[method]({ active, page: 2, limit: 10 });
      const query = find.mock.calls[0][0];
      if (expected === undefined) expect(query.where).not.toHaveProperty(activeField);
      else expect(query.where[activeField]).toBe(expected);
      expect(query.limit).toBe(10);
      expect(query.offset).toBe(10);
      expect(query.order.length).toBeGreaterThan(0);
    });
  },
);

describe.each([
  ['companies', CompanyRepository, Company, 'active'],
  ['users', UserRepository, User, 'isActive'],
])('%s deleted collections', (_name, Repository, Model, activeField) => {
  afterEach(() => jest.restoreAllMocks());

  it.each([{ deleted: true }, { includeDeleted: true }])(
    'preserves all statuses with %p',
    async (filters) => {
      const find = jest.spyOn(Model, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
      await new Repository().findAll(filters);
      const query = find.mock.calls[0][0];
      expect(query.where).not.toHaveProperty(activeField);
      expect(query.paranoid).toBe(false);
      if (filters.deleted) expect(query.where.deletedAt[Op.ne]).toBeNull();

      await new Repository().findAll({ ...filters, active: true });
      expect(find.mock.calls[1][0].where[activeField]).toBe(true);
    },
  );
});

describe('active list parameter validation', () => {
  it.each([
    ['true', true],
    ['false', false],
    ['1', true],
    ['0', false],
    ['all', 'all'],
  ])('accepts %s without losing its meaning', async (input, expected) => {
    const request = { query: { active: input } };
    await activeFilterValidator().run(request);
    expect(validationResult(request).isEmpty()).toBe(true);
    expect(request.query.active).toBe(expected);
  });

  it('rejects an unknown status', async () => {
    const request = { query: { active: 'invalid' } };
    await activeFilterValidator().run(request);
    expect(validationResult(request).isEmpty()).toBe(false);
  });
});
