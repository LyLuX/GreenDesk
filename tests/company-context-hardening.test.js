import { jest } from '@jest/globals';
import {
  companyValues,
  companyWhere,
  getCompanyScope,
  requireCompanyInstance,
  requireCompanyScope,
  runWithCompanyScope,
} from '../src/core/company/company-context.js';
import sequelize from '../src/config/database.js';
import Category from '../src/modules/categories/model/category.model.js';
import CategoryRepository from '../src/modules/categories/repository/category.repository.js';
import ManufacturerRepository from '../src/modules/manufacturers/repository/manufacturer.repository.js';
import SupplierRepository from '../src/modules/suppliers/repository/supplier.repository.js';
import MaterialRepository from '../src/modules/materials/repository/material.repository.js';
import MaterialFileRepository from '../src/modules/materials/repository/material-file.repository.js';
import MaterialFile from '../src/modules/materials/model/material-file.model.js';
import MaintenanceRepository from '../src/modules/maintenance/repository/maintenance.repository.js';
import MaintenanceCatalogRepository from '../src/modules/maintenance/repository/maintenance-catalog.repository.js';
import IdempotencyRepository from '../src/core/idempotency/idempotency.repository.js';
import StockService from '../src/core/inventory/stock.service.js';
import AuditService from '../src/modules/audit/service/audit.service.js';
import AuditLog from '../src/modules/audit/model/audit-log.model.js';
import HistoryRepository from '../src/modules/audit/repository/history.repository.js';
import UserService from '../src/modules/users/service/user.service.js';
import EmailVerificationService from '../src/modules/auth/service/email-verification.service.js';

const invalidScopes = [
  null,
  {},
  { companyId: 0 },
  { companyId: -1 },
  { companyId: 1.2 },
  { companyId: NaN },
  { companyId: Infinity },
  { companyId: '1' },
  { companyId: true },
  { companyId: Number.MAX_SAFE_INTEGER + 1 },
];
const scoped = (callback) => runWithCompanyScope({ companyId: 1 }, callback);
afterEach(() => jest.restoreAllMocks());

describe('R1 business context boundary', () => {
  it.each(invalidScopes)(
    'rejects invalid scope %j before model or transaction calls',
    async (scope) => {
      const find = jest.spyOn(Category, 'findOne');
      const create = jest.spyOn(Category, 'create');
      const transaction = jest.spyOn(sequelize, 'transaction');
      await runWithCompanyScope(scope, async () => {
        expect(() => requireCompanyScope()).toThrow();
        await expect(new CategoryRepository().findByUuid('resource')).rejects.toMatchObject({
          statusCode: 403,
        });
        await expect(new CategoryRepository().create({ companyId: 2 })).rejects.toMatchObject({
          statusCode: 403,
        });
        expect(() => new CategoryRepository().withTransaction(() => {})).toThrow();
      });
      expect(find).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('forces server company and retains independent concurrent scopes', async () => {
    const originalScope = { companyId: 1 };
    await Promise.all(
      [1, 2].map((companyId) =>
        runWithCompanyScope(companyId === 1 ? originalScope : { companyId }, async () => {
          originalScope.companyId = 9;
          await Promise.resolve();
          expect(companyWhere({ companyId: 9, uuid: 'item' })).toEqual({ companyId, uuid: 'item' });
          expect(companyValues({ companyId: 9 })).toEqual({ companyId });
          expect(Object.isFrozen(getCompanyScope())).toBe(true);
        }),
      ),
    );
    expect(getCompanyScope()).toBeNull();
  });

  it('rejects an instance whose persisted company was changed in memory', () =>
    scoped(() => {
      expect(() => requireCompanyInstance({ companyId: 1, previous: () => 2 })).toThrow();
      expect(requireCompanyInstance({ companyId: '1' })).toEqual({ companyId: '1' });
    }));
});

const mutations = [
  [CategoryRepository, 'update'],
  [CategoryRepository, 'delete'],
  [CategoryRepository, 'restore'],
  [ManufacturerRepository, 'update'],
  [ManufacturerRepository, 'delete'],
  [ManufacturerRepository, 'restore'],
  [SupplierRepository, 'update'],
  [SupplierRepository, 'delete'],
  [SupplierRepository, 'restore'],
  [MaterialRepository, 'update'],
  [MaterialRepository, 'delete'],
  [MaterialRepository, 'restore'],
  [MaterialFileRepository, 'remove'],
  [MaterialFileRepository, 'setPrimary'],
  [MaintenanceRepository, 'update'],
  [MaintenanceRepository, 'remove'],
  [MaintenanceCatalogRepository, 'updateOperation'],
  [MaintenanceCatalogRepository, 'restoreOperation'],
  [MaintenanceCatalogRepository, 'removeOperation'],
  [MaintenanceCatalogRepository, 'updatePart'],
  [MaintenanceCatalogRepository, 'restorePart'],
  [MaintenanceCatalogRepository, 'removePart'],
  [IdempotencyRepository, 'complete'],
];

describe('R1 instance provenance', () => {
  it.each(mutations)(
    '%p.%s rejects foreign and missing provenance before mutations',
    async (Repository, method) => {
      const resetPhotos = jest.spyOn(MaterialFile, 'update');
      const begin = jest.spyOn(sequelize, 'transaction');
      for (const scope of [null, { companyId: 1 }]) {
        for (const companyId of [2, undefined]) {
          const instance = { companyId, update: jest.fn(), destroy: jest.fn(), restore: jest.fn() };
          await expect(
            runWithCompanyScope(scope, async () => new Repository()[method](instance, {})),
          ).rejects.toMatchObject({ statusCode: 403 });
          expect(instance.update).not.toHaveBeenCalled();
          expect(instance.destroy).not.toHaveBeenCalled();
          expect(instance.restore).not.toHaveBeenCalled();
        }
      }
      expect(resetPhotos).not.toHaveBeenCalled();
      expect(begin).not.toHaveBeenCalled();
    },
  );

  it('prevents reassigning a valid instance to another company', async () =>
    scoped(async () => {
      const instance = { companyId: 1, update: jest.fn() };
      await new CategoryRepository().update(instance, { name: 'A', companyId: 2 });
      expect(instance.update).toHaveBeenCalledWith({ name: 'A', companyId: 1 }, expect.anything());
    }));

  it('refuses foreign stock before changing quantities or writing movements', async () =>
    scoped(async () => {
      const instance = { companyId: 2, update: jest.fn() };
      const movements = { create: jest.fn() };
      await expect(
        new StockService(movements).apply(instance, { operation: 'order', quantity: 1 }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(instance.update).not.toHaveBeenCalled();
      expect(movements.create).not.toHaveBeenCalled();
    }));
});

describe('R1 mixed and global boundaries', () => {
  it('distinguishes contextual, global and server-attributed audit events', async () => {
    const create = jest.spyOn(AuditLog, 'create').mockResolvedValue({});
    const audit = new AuditService();
    const event = { action: 'TEST', entity: 'USER', companyId: 2 };
    await expect(audit.record(event)).rejects.toMatchObject({ statusCode: 403 });
    expect(create).not.toHaveBeenCalled();
    await scoped(() => audit.record(event));
    expect(create.mock.lastCall[0].companyId).toBe(1);
    await scoped(() => audit.recordGlobal(event));
    expect(create.mock.lastCall[0].companyId).toBeNull();
    await audit.recordAttributed(event);
    expect(create.mock.lastCall[0].companyId).toBe(2);
    await audit.recordAttributed({ ...event, companyId: null });
    expect(create.mock.lastCall[0].companyId).toBeNull();
    create.mockClear();
    await expect(audit.recordAttributed({ ...event, companyId: -1 })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects invalid scope even in administration history with accessAll', async () => {
    const find = jest.spyOn(AuditLog, 'findAndCountAll');
    await expect(
      runWithCompanyScope({ companyId: -1, accessAll: true }, () =>
        new HistoryRepository().findAuditEvents('administration', {}, 10),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(find).not.toHaveBeenCalled();
  });

  it.each([[[]], [['companies.access.all']]])(
    'refuses administrative user access without context (%j)',
    async (permissions) => {
      const repository = { findAll: jest.fn(), findByUuid: jest.fn(), withTransaction: jest.fn() };
      const users = new UserService(repository);
      const emails = new EmailVerificationService(undefined, repository);
      await expect(users.getAll({}, permissions)).rejects.toMatchObject({ statusCode: 403 });
      await expect(
        users.getByUuid('id', { visibilityPermissions: permissions }),
      ).rejects.toMatchObject({ statusCode: 403 });
      await expect(users.restore('id', 1, { permissions })).rejects.toMatchObject({
        statusCode: 403,
      });
      await expect(users.remove('id', 1, { permissions })).rejects.toMatchObject({
        statusCode: 403,
      });
      await expect(users.create({ email: 'test@example.test' })).rejects.toMatchObject({
        statusCode: 403,
      });
      await expect(users.resolveCompanies(undefined)).rejects.toMatchObject({ statusCode: 403 });
      await expect(emails.resendByUserUuid('id', 1, { permissions })).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(repository.findAll).not.toHaveBeenCalled();
      expect(repository.findByUuid).not.toHaveBeenCalled();
      expect(repository.withTransaction).not.toHaveBeenCalled();
    },
  );

  it('keeps the explicit identity lookup available without business context', async () => {
    const repository = { findByUuid: jest.fn().mockResolvedValue({ uuid: 'identity' }) };
    await expect(new UserService(repository).getIdentityByUuid('identity')).resolves.toEqual({
      uuid: 'identity',
    });
  });
});
