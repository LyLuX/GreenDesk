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
  updatePartMinimumStock: jest.fn((_request, response) =>
    response.json({ success: true, data: {} }),
  ),
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
  interventions: jest.fn((_request, response) => response.json({ success: true, data: [] })),
  createIntervention: jest.fn((_request, response) =>
    response.status(201).json({ success: true, data: {} }),
  ),
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
      updatePartMinimumStock = catalogController.updatePartMinimumStock;
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
    interventions = maintenanceController.interventions;
    createIntervention = maintenanceController.createIntervention;
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
const { default: Company } = await import('../src/modules/companies/model/company.model.js');
const { default: User } = await import('../src/modules/users/model/user.model.js');

const tokenFor = (permissions) =>
  jwt.sign(
    {
      sub: 'f75ce638-18d2-4e29-9958-2afaa4ae5151',
      userId: 1,
      roles: [],
      permissions,
      companyAccess: [{ id: 1, uuid: 'f75ce638-18d2-4e29-9958-2afaa4ae5151' }],
    },
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
    jest.spyOn(Company, 'findOne').mockResolvedValue({ id: 1, uuid, active: true });
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

  it('applies the matching permissions to each order-list stock mode', async () => {
    const path = '/api/v1/maintenance/order-list';

    await request(app)
      .get(path)
      .set('Authorization', authorization(['maintenance.read']))
      .expect(200);
    await request(app)
      .get(`${path}?lowStockOnly=true`)
      .set('Authorization', authorization(['maintenance.read']))
      .expect(403);
    await request(app)
      .get(`${path}?lowStockOnly=true`)
      .set('Authorization', authorization(['maintenance.parts.read']))
      .expect(200);
    await request(app)
      .get(`${path}?includeLowStock=true`)
      .set('Authorization', authorization(['maintenance.read']))
      .expect(403);
    await request(app)
      .get(`${path}?includeLowStock=true`)
      .set('Authorization', authorization(['maintenance.read', 'maintenance.parts.read']))
      .expect(200);
    await request(app)
      .get(`${path}?includeLowStock=invalid`)
      .set('Authorization', authorization(['maintenance.read', 'maintenance.parts.read']))
      .expect(400);
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

  it('accepts a decimal plan quantity written with a comma', async () => {
    const payload = {
      materialUuid: uuid,
      operationUuid: uuid,
      parts: [{ partUuid: uuid, quantity: '0,6' }],
    };

    await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', authorization(['maintenance.create']))
      .send(payload)
      .expect(201);

    await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', authorization(['maintenance.create']))
      .send({ ...payload, parts: [{ partUuid: uuid, quantity: 0.005 }] })
      .expect(400);

    expect(maintenanceController.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          parts: [expect.objectContaining({ quantity: 0.6 })],
        }),
      }),
      expect.anything(),
      expect.anything(),
    );
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
      .delete(`/api/v1/maintenance/parts/${uuid}`)
      .set('Authorization', authorization(['maintenance.parts.delete']))
      .expect(204);
  });

  it('separates catalogue and plan status changes from general updates', async () => {
    for (const [path, updatePermission, statusPermission] of [
      [
        `/api/v1/maintenance/operations/${uuid}`,
        'maintenance.operations.update',
        'maintenance.operations.status.update',
      ],
      [
        `/api/v1/maintenance/parts/${uuid}`,
        'maintenance.parts.update',
        'maintenance.parts.status.update',
      ],
    ]) {
      await request(app)
        .put(path)
        .set('Authorization', authorization([updatePermission]))
        .send({ active: false })
        .expect(403);
      await request(app)
        .put(path)
        .set('Authorization', authorization([statusPermission]))
        .send({ active: 'invalid' })
        .expect(400);
    }

    await request(app)
      .patch(`/api/v1/maintenance/${uuid}/status`)
      .set('Authorization', authorization(['maintenance.update']))
      .send({ active: false })
      .expect(403);
    await request(app)
      .patch(`/api/v1/maintenance/${uuid}/status`)
      .set('Authorization', authorization(['maintenance.status.update']))
      .send({ active: false })
      .expect(200);
  });

  it('requires the permission matching each stock operation', async () => {
    const path = `/api/v1/maintenance/parts/${uuid}/stock`;
    const permissions = {
      adjustOnHand: 'maintenance.parts.stock.adjust_on_hand',
      adjustOnOrder: 'maintenance.parts.stock.adjust_on_order',
      order: 'maintenance.parts.stock.order',
      receive: 'maintenance.parts.stock.receive',
    };

    await request(app)
      .patch(path)
      .set('Authorization', authorization(['maintenance.parts.update']))
      .send({ operation: 'order', quantity: 3 })
      .expect(403);
    await request(app)
      .patch(path)
      .set('Authorization', authorization([permissions.order]))
      .send({ operation: 'order', quantity: 0.6, performedAt: '2026-08-20' })
      .expect(200);
    await request(app)
      .patch(path)
      .set('Authorization', authorization([permissions.order]))
      .send({ operation: 'receive', quantity: 1 })
      .expect(403);
    await request(app)
      .patch(path)
      .set('Authorization', authorization([permissions.receive]))
      .send({ operation: 'receive', quantity: 1 })
      .expect(200);
    await request(app)
      .patch(path)
      .set('Authorization', authorization([permissions.adjustOnHand]))
      .send({ operation: 'adjust', quantityOnHand: 4 })
      .expect(200);
    await request(app)
      .patch(path)
      .set('Authorization', authorization([permissions.adjustOnOrder]))
      .send({ operation: 'adjust', quantityOnOrder: 2 })
      .expect(200);
    await request(app)
      .patch(path)
      .set('Authorization', authorization([permissions.adjustOnHand]))
      .send({ operation: 'adjust', quantityOnHand: 4, quantityOnOrder: 2 })
      .expect(403);
    await request(app)
      .patch(path)
      .set('Authorization', authorization([permissions.adjustOnHand, permissions.adjustOnOrder]))
      .send({ operation: 'adjust', quantityOnHand: 4, quantityOnOrder: 2 })
      .expect(200);
    await request(app)
      .patch(path)
      .set('Authorization', authorization([permissions.adjustOnHand, permissions.adjustOnOrder]))
      .send({ stockStatus: 'inStock', stockQuantity: 4 })
      .expect(200);
    expect(catalogController.updatePartStock).toHaveBeenCalled();
  });

  it('requires the dedicated price-update permission', async () => {
    const path = `/api/v1/maintenance/parts/${uuid}/price`;
    await request(app)
      .patch(path)
      .set('Authorization', authorization(['maintenance.parts.update']))
      .send({ unitPrice: 12.5 })
      .expect(403);
    await request(app)
      .patch(path)
      .set('Authorization', authorization(['maintenance.parts.price.update']))
      .send({ unitPrice: 12.5, performedAt: '2026-08-19' })
      .expect(200);
    await request(app)
      .patch(path)
      .set('Authorization', authorization(['maintenance.parts.price.update']))
      .send({ unitPrice: 12.5, performedAt: '19/08/2026' })
      .expect(400);
    expect(catalogController.updatePartPrice).toHaveBeenCalled();
  });

  it('requires the dedicated minimum-stock update permission', async () => {
    const path = `/api/v1/maintenance/parts/${uuid}/minimum-stock`;
    await request(app)
      .patch(path)
      .set('Authorization', authorization(['maintenance.parts.update']))
      .send({ minimumStockQuantity: 2.5 })
      .expect(403);
    await request(app)
      .patch(path)
      .set('Authorization', authorization(['maintenance.parts.stock.minimum.update']))
      .send({ minimumStockQuantity: 2.5 })
      .expect(200);
    await request(app)
      .patch(path)
      .set('Authorization', authorization(['maintenance.parts.stock.minimum.update']))
      .send({ minimumStockQuantity: -1 })
      .expect(400);
    expect(catalogController.updatePartMinimumStock).toHaveBeenCalled();
  });

  it('validates stock updates and rejects unrelated permissions', async () => {
    await request(app)
      .patch(`/api/v1/maintenance/parts/${uuid}/stock`)
      .set('Authorization', authorization(['maintenance.update']))
      .send({ operation: 'order', quantity: 3 })
      .expect(403);
    await request(app)
      .patch(`/api/v1/maintenance/parts/${uuid}/stock`)
      .set('Authorization', authorization(['maintenance.parts.stock.receive']))
      .send({ operation: 'receive', quantity: -1 })
      .expect(400);
    await request(app)
      .patch(`/api/v1/maintenance/parts/${uuid}/stock`)
      .set('Authorization', authorization(['maintenance.parts.stock.order']))
      .send({ operation: 'order', quantity: 3, performedAt: '20/08/2026' })
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

  it('protects unplanned interventions with their dedicated permissions', async () => {
    const path = '/api/v1/maintenance/interventions';
    const payload = {
      materialUuid: uuid,
      description: 'Remplacement d’une grille cassée.',
      performedAt: '2026-08-20',
      parts: [{ partUuid: uuid, quantity: 1 }],
    };

    await request(app)
      .get(`${path}?materialUuid=${uuid}&page=1&limit=5`)
      .set('Authorization', authorization(['maintenance.read']))
      .expect(200);
    await request(app)
      .post(path)
      .set('Authorization', authorization(['maintenance.execute']))
      .send(payload)
      .expect(403);
    await request(app)
      .post(path)
      .set('Authorization', authorization(['maintenance.parts.stock.consume']))
      .send(payload)
      .expect(201);
    await request(app)
      .post(path)
      .set('Authorization', authorization(['maintenance.parts.stock.consume']))
      .send({ ...payload, description: '' })
      .expect(400);
  });
});
