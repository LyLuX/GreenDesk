import { jest } from '@jest/globals';
import CompanyService from '../src/modules/companies/service/company.service.js';
import CategoryService from '../src/modules/categories/service/category.service.js';
import ManufacturerService from '../src/modules/manufacturers/service/manufacturer.service.js';
import SupplierService from '../src/modules/suppliers/service/supplier.service.js';
import MaterialService from '../src/modules/materials/service/material.service.js';
import MaintenanceService from '../src/modules/maintenance/service/maintenance.service.js';
import CatalogService from '../src/modules/maintenance/service/maintenance-catalog.service.js';
import RoleService from '../src/modules/roles/service/role.service.js';
import PermissionService from '../src/modules/permissions/service/permission.service.js';

const families = [
  [CompanyService, 'create', 'update'],
  [CategoryService, 'create', 'update'],
  [ManufacturerService, 'create', 'update'],
  [SupplierService, 'create', 'update'],
  [MaterialService, 'create', 'update'],
  [MaintenanceService, 'create', 'update'],
  [CatalogService, 'createOperation', 'updateOperation'],
  [CatalogService, 'createPart', 'updatePart'],
  [RoleService, 'create', 'update'],
  [PermissionService, 'create', 'update'],
];
const forbidden = [
  'id',
  'uuid',
  'companyId',
  'company_id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'deleted_at',
  'createdBy',
  'updatedBy',
  'logoFileName',
  'logo_file_name',
  'logoMimeType',
  'manufacturerId',
  'categoryId',
  'supplierId',
  'materialId',
  'operationId',
];

describe('R4 persisted write contracts', () => {
  it.each(
    families.flatMap(([Service, create, update]) =>
      forbidden.flatMap((field) => [
        [Service, create, false, field],
        [Service, update, true, field],
      ]),
    ),
  )('%p.%s rejects %s/%s before repository access', async (Service, method, updating, field) => {
    const access = jest.fn(() => {
      throw new Error('Unexpected repository access');
    });
    const dependency = new Proxy({}, { get: () => access });
    const service = new Service(dependency, dependency, dependency, dependency, dependency);
    const values = { [field]: 'fake-internal-value' };
    await expect(
      updating ? service[method]('uuid', values, 1) : service[method](values, 1),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(access).not.toHaveBeenCalled();
  });
  it.each(['create', 'update'])(
    'keeps plan state exclusive to status actions: %s',
    async (method) => {
      const service = new MaintenanceService({});
      await expect(
        method === 'create'
          ? service.create({ active: true }, 1)
          : service.update('uuid', { active: true }, 1),
      ).rejects.toMatchObject({ statusCode: 400 });
    },
  );
  it.each([
    'unitPrice',
    'quantityOnHand',
    'quantityOnOrder',
    'minimumStockQuantity',
    'stockStatus',
    'stockQuantity',
  ])('rejects dedicated part field %s from generic update', async (field) => {
    await expect(
      new CatalogService({}).updatePart('uuid', { [field]: 12 }, 1),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
