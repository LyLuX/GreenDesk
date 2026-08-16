import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const catalogController = {
  operations: jest.fn((_request, response) => response.json({ success: true, data: [] })),
  createOperation: jest.fn((_request, response) =>
    response.status(201).json({ success: true, data: {} }),
  ),
  updateOperation: jest.fn((_request, response) => response.json({ success: true, data: {} })),
  removeOperation: jest.fn((_request, response) => response.status(204).send()),
  parts: jest.fn((_request, response) => response.json({ success: true, data: [] })),
  createPart: jest.fn((_request, response) =>
    response.status(201).json({ success: true, data: {} }),
  ),
  updatePart: jest.fn((_request, response) => response.json({ success: true, data: {} })),
  updatePartStock: jest.fn((_request, response) => response.json({ success: true, data: {} })),
  updatePartPrice: jest.fn((_request, response) => response.json({ success: true, data: {} })),
  partStockMovements: jest.fn((_request, response) =>
    response.json({ success: true, data: { items: [], pagination: {} } }),
  ),
  partPriceHistory: jest.fn((_request, response) =>
    response.json({ success: true, data: { items: [], pagination: {} } }),
  ),
  removePart: jest.fn((_request, response) => response.status(204).send()),
};
const maintenanceController = {
  getAll: jest.fn((_request, response) => response.json({ success: true, data: [] })),
  getByUuid: jest.fn((_request, response) => response.json({ success: true, data: {} })),
  orderList: jest.fn((_request, response) => response.json({ success: true, data: [] })),
  create: jest.fn((_request, response) => response.status(201).json({ success: true, data: {} })),
  update: jest.fn((_request, response) => response.json({ success: true, data: {} })),
  status: jest.fn((_request, response) => response.json({ success: true, data: {} })),
  remove: jest.fn((_request, response) => response.status(204).send()),
  execute: jest.fn((_request, response) => response.json({ success: true, data: {} })),
  history: jest.fn((_request, response) => response.json({ success: true, data: [] })),
};
const manufacturerController = {
  getAll: jest.fn((_request, response) => response.json({ success: true, data: [] })),
  create: jest.fn(),
  logoContent: jest.fn((_request, response) => response.status(404).json({ success: false })),
  uploadLogo: jest.fn(),
  removeLogo: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};
const supplierController = {
  getAll: jest.fn((_request, response) => response.json({ success: true, data: [] })),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

jest.unstable_mockModule(
  '../src/modules/maintenance/controller/maintenance-catalog.controller.js',
  () => ({
    default: class MaintenanceCatalogController {
      operations = catalogController.operations;
      createOperation = catalogController.createOperation;
      updateOperation = catalogController.updateOperation;
      removeOperation = catalogController.removeOperation;
      parts = catalogController.parts;
      createPart = catalogController.createPart;
      updatePart = catalogController.updatePart;
      updatePartStock = catalogController.updatePartStock;
      updatePartPrice = catalogController.updatePartPrice;
      partStockMovements = catalogController.partStockMovements;
      partPriceHistory = catalogController.partPriceHistory;
      removePart = catalogController.removePart;
    },
  }),
);
jest.unstable_mockModule('../src/modules/maintenance/controller/maintenance.controller.js', () => ({
  default: class MaintenanceController {
    getAll = maintenanceController.getAll;
    getByUuid = maintenanceController.getByUuid;
    orderList = maintenanceController.orderList;
    create = maintenanceController.create;
    update = maintenanceController.update;
    status = maintenanceController.status;
    remove = maintenanceController.remove;
    execute = maintenanceController.execute;
    history = maintenanceController.history;
  },
}));
jest.unstable_mockModule(
  '../src/modules/manufacturers/controller/manufacturer.controller.js',
  () => ({
    default: class ManufacturerController {
      getAll = manufacturerController.getAll;
      create = manufacturerController.create;
      logoContent = manufacturerController.logoContent;
      uploadLogo = manufacturerController.uploadLogo;
      removeLogo = manufacturerController.removeLogo;
      update = manufacturerController.update;
      remove = manufacturerController.remove;
    },
  }),
);
jest.unstable_mockModule('../src/modules/suppliers/controller/supplier.controller.js', () => ({
  default: class SupplierController {
    getAll = supplierController.getAll;
    create = supplierController.create;
    update = supplierController.update;
    remove = supplierController.remove;
  },
}));

const { default: app } = await import('../src/app.js');
const { default: env } = await import('../src/config/env.js');
const { default: sequelize } = await import('../src/config/database.js');
const { default: User } = await import('../src/modules/users/model/user.model.js');

const tokenFor = (permissions) =>
  jwt.sign(
    { sub: 'f75ce638-18d2-4e29-9958-2afaa4ae5151', userId: 1, roles: [], permissions },
    env.jwt.secret,
  );
const authorization = (permissions) => `Bearer ${tokenFor(permissions)}`;
const uuid = 'f75ce638-18d2-4e29-9958-2afaa4ae5151';

describe('maintenance catalogue route permissions', () => {
  beforeAll(() => {
    jest
      .spyOn(sequelize, 'transaction')
      .mockImplementation(async (...args) => args.at(-1)({ id: 'route-test-transaction' }));
    jest.spyOn(User, 'findOne').mockResolvedValue({ id: 1 });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it.each(['/api/v1/manufacturers', '/api/v1/suppliers'])(
    'allows part readers to load the %s dependency',
    async (path) => {
      await request(app)
        .get(path)
        .set('Authorization', authorization(['maintenance.parts.read']))
        .expect(200);
    },
  );

  it.each([
    ['/api/v1/maintenance/operations', 'maintenance.operations.read'],
    ['/api/v1/maintenance/parts', 'maintenance.parts.read'],
  ])('allows the dedicated read permission on %s', async (path, permission) => {
    await request(app)
      .get(path)
      .set('Authorization', authorization([permission]))
      .expect(200);
  });

  it.each(['/api/v1/maintenance/operations', '/api/v1/maintenance/parts'])(
    'allows plan readers to load catalogue choices from %s',
    async (path) => {
      await request(app)
        .get(path)
        .set('Authorization', authorization(['maintenance.read']))
        .expect(200);
    },
  );

  it.each([
    ['/api/v1/maintenance/operations', 'maintenance.parts.read'],
    ['/api/v1/maintenance/parts', 'maintenance.operations.read'],
  ])('rejects an unrelated maintenance permission on %s', async (path, permission) => {
    await request(app)
      .get(path)
      .set('Authorization', authorization([permission]))
      .expect(403);
  });

  it('requires operation-specific permissions for operation writes', async () => {
    const payload = { name: 'Vidange', maintenanceType: 'preventive' };
    await request(app)
      .post('/api/v1/maintenance/operations')
      .set('Authorization', authorization(['maintenance.create']))
      .send(payload)
      .expect(403);
    await request(app)
      .post('/api/v1/maintenance/operations')
      .set('Authorization', authorization(['maintenance.operations.create']))
      .send(payload)
      .expect(201);
    await request(app)
      .put(`/api/v1/maintenance/operations/${uuid}`)
      .set('Authorization', authorization(['maintenance.operations.update']))
      .send({ name: 'Vidange moteur' })
      .expect(200);
    await request(app)
      .delete(`/api/v1/maintenance/operations/${uuid}`)
      .set('Authorization', authorization(['maintenance.operations.delete']))
      .expect(204);
  });

  it('requires part-specific permissions for part writes', async () => {
    const payload = { name: 'Bougie', reference: 'BPMR8Y', unit: 'pièce', unitPrice: 12.5 };
    await request(app)
      .post('/api/v1/maintenance/parts')
      .set('Authorization', authorization(['maintenance.create']))
      .send(payload)
      .expect(403);
    await request(app)
      .post('/api/v1/maintenance/parts')
      .set('Authorization', authorization(['maintenance.parts.create']))
      .send(payload)
      .expect(201);
    await request(app)
      .post('/api/v1/maintenance/parts')
      .set('Authorization', authorization(['maintenance.parts.create']))
      .send({ ...payload, unitPrice: 12.345 })
      .expect(400);
    await request(app)
      .put(`/api/v1/maintenance/parts/${uuid}`)
      .set('Authorization', authorization(['maintenance.parts.update']))
      .send({ name: 'Bougie moteur' })
      .expect(200);
    await request(app)
      .patch(`/api/v1/maintenance/parts/${uuid}/stock`)
      .set('Authorization', authorization(['maintenance.parts.update']))
      .send({ operation: 'order', quantity: 3 })
      .expect(200);
    expect(catalogController.updatePartStock).toHaveBeenCalled();
    await request(app)
      .patch(`/api/v1/maintenance/parts/${uuid}/price`)
      .set('Authorization', authorization(['maintenance.parts.update']))
      .send({ unitPrice: 12.5 })
      .expect(200);
    expect(catalogController.updatePartPrice).toHaveBeenCalled();
    await request(app)
      .delete(`/api/v1/maintenance/parts/${uuid}`)
      .set('Authorization', authorization(['maintenance.parts.delete']))
      .expect(204);
  });

  it('validates stock updates and rejects unrelated permissions', async () => {
    await request(app)
      .patch(`/api/v1/maintenance/parts/${uuid}/stock`)
      .set('Authorization', authorization(['maintenance.update']))
      .send({ operation: 'order', quantity: 3 })
      .expect(403);
    await request(app)
      .patch(`/api/v1/maintenance/parts/${uuid}/stock`)
      .set('Authorization', authorization(['maintenance.parts.update']))
      .send({ operation: 'receive', quantity: -1 })
      .expect(400);
  });

  it('protects and validates the paginated stock movement history', async () => {
    await request(app)
      .get(`/api/v1/maintenance/parts/${uuid}/stock-movements?page=1&limit=10`)
      .set('Authorization', authorization(['maintenance.parts.read']))
      .expect(200);
    await request(app)
      .get(`/api/v1/maintenance/parts/${uuid}/stock-movements`)
      .set('Authorization', authorization(['maintenance.read']))
      .expect(403);
  });

  it('protects the paginated price history with the part read permission', async () => {
    await request(app)
      .get(`/api/v1/maintenance/parts/${uuid}/price-history?page=1&limit=10`)
      .set('Authorization', authorization(['maintenance.parts.read']))
      .expect(200);
    await request(app)
      .get(`/api/v1/maintenance/parts/${uuid}/price-history`)
      .set('Authorization', authorization(['maintenance.read']))
      .expect(403);
  });

  it('requires an additional permission to execute without replacing parts', async () => {
    const path = `/api/v1/maintenance/${uuid}/execute`;
    const exceptionalPermission = 'maintenance.execute.skip_parts';

    await request(app)
      .post(path)
      .set('Authorization', authorization(['maintenance.execute']))
      .send({ partsAction: 'skip', comment: 'Pièce encore en bon état.' })
      .expect(403);
    await request(app)
      .post(path)
      .set('Authorization', authorization([exceptionalPermission]))
      .send({ partsAction: 'skip', comment: 'Pièce encore en bon état.' })
      .expect(403);
    await request(app)
      .post(path)
      .set('Authorization', authorization(['maintenance.execute']))
      .send({ partsAction: 'consume' })
      .expect(200);
    await request(app)
      .post(path)
      .set('Authorization', authorization(['maintenance.execute', exceptionalPermission]))
      .send({ partsAction: 'skip', comment: 'Pièce encore en bon état.' })
      .expect(200);

    expect(maintenanceController.execute).toHaveBeenCalledTimes(2);
  });
});
