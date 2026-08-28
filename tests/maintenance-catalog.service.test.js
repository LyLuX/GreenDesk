import { jest } from '@jest/globals';

import MaintenanceCatalogService from '../src/modules/maintenance/service/maintenance-catalog.service.js';

describe('MaintenanceCatalogService', () => {
  it('allows an update when the name lookup returns the operation being edited', async () => {
    const operation = {
      id: 1,
      uuid: '11111111-1111-4111-8111-111111111111',
      name: 'Vidange',
      maintenanceType: 'service',
      toJSON() {
        return { ...this };
      },
    };
    const repository = {
      findOperationByUuid: jest.fn().mockResolvedValue(operation),
      findOperationByName: jest.fn().mockResolvedValue(operation),
      withTransaction: jest.fn((callback) => callback(undefined)),
      updateOperation: jest.fn((item, values) => Object.assign(item, values)),
      updateTasksForOperation: jest.fn(),
    };
    const service = new MaintenanceCatalogService(repository, { record: jest.fn() });

    await expect(
      service.updateOperation(operation.uuid, { name: 'VIDANGE' }, 42),
    ).resolves.toMatchObject({ name: 'VIDANGE' });
  });

  it('renames every linked plan when an operation is renamed', async () => {
    const operation = {
      id: 1,
      uuid: '11111111-1111-4111-8111-111111111111',
      name: 'Bougie',
      maintenanceType: 'replacement',
      active: true,
      toJSON() {
        return { ...this };
      },
    };
    const transaction = { id: 'transaction' };
    const repository = {
      findOperationByUuid: jest.fn().mockResolvedValue(operation),
      findOperationByName: jest.fn().mockResolvedValue(null),
      withTransaction: jest.fn((callback) => callback(transaction)),
      updateOperation: jest.fn((item, values) => Object.assign(item, values)),
      updateTasksForOperation: jest.fn(),
    };
    const auditService = { record: jest.fn() };
    const service = new MaintenanceCatalogService(repository, auditService);

    const result = await service.updateOperation(
      operation.uuid,
      { name: 'Remplacement des bougies' },
      42,
    );

    expect(repository.updateTasksForOperation).toHaveBeenCalledWith(
      operation.id,
      {
        title: 'Remplacement des bougies',
        maintenanceType: 'replacement',
      },
      { transaction },
    );
    expect(result.name).toBe('Remplacement des bougies');
  });

  it('refuses to delete a part still assigned to a plan', async () => {
    const part = {
      id: 2,
      uuid: '22222222-2222-4222-8222-222222222222',
      name: 'Bougie',
      reference: 'BPMR8Y',
    };
    const repository = {
      findPartByUuid: jest.fn().mockResolvedValue(part),
      countTasksForPart: jest.fn().mockResolvedValue(1),
      removePart: jest.fn(),
      withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
    };
    const service = new MaintenanceCatalogService(repository, {});

    await expect(service.removePart(part.uuid, 42)).rejects.toThrow('encore utilisée par un plan');
    expect(repository.removePart).not.toHaveBeenCalled();
  });

  it('stores manufacturer and supplier relations while preserving their names', async () => {
    const transaction = { id: 'transaction' };
    const manufacturer = {
      id: 3,
      uuid: '33333333-3333-4333-8333-333333333333',
      name: 'NGK',
      active: true,
    };
    const supplier = {
      id: 4,
      uuid: '44444444-4444-4444-8444-444444444444',
      name: 'Pièces Pro',
      active: true,
    };
    const created = {
      id: 5,
      uuid: '55555555-5555-4555-8555-555555555555',
      name: 'Bougie',
      reference: 'BPMR8Y',
    };
    const repository = {
      withTransaction: jest.fn((callback) => callback(transaction)),
      findPartByIdentity: jest.fn().mockResolvedValue(null),
      createPart: jest.fn().mockResolvedValue(created),
      findPartByUuid: jest.fn().mockResolvedValue({
        ...created,
        manufacturer: manufacturer.name,
        supplier: supplier.name,
        manufacturerDirectory: manufacturer,
        supplierDirectory: supplier,
      }),
    };
    const auditService = { record: jest.fn() };
    const manufacturerRepository = {
      findByUuid: jest.fn().mockResolvedValue(manufacturer),
    };
    const supplierRepository = {
      findByUuid: jest.fn().mockResolvedValue(supplier),
    };
    const service = new MaintenanceCatalogService(
      repository,
      auditService,
      manufacturerRepository,
      supplierRepository,
    );

    const result = await service.createPart(
      {
        name: 'Bougie',
        reference: 'BPMR8Y',
        manufacturerUuid: manufacturer.uuid,
        supplierUuid: supplier.uuid,
        unitPrice: 12.5,
      },
      42,
    );

    expect(repository.createPart).toHaveBeenCalledWith(
      expect.objectContaining({
        manufacturerId: manufacturer.id,
        manufacturer: manufacturer.name,
        supplierId: supplier.id,
        supplier: supplier.name,
        unitPrice: '12.50',
      }),
      { transaction },
    );
    expect(result).toEqual(
      expect.objectContaining({
        manufacturer: 'NGK',
        manufacturerUuid: manufacturer.uuid,
        supplier: 'Pièces Pro',
        supplierUuid: supplier.uuid,
      }),
    );
  });

  it('delegates stock orders to the reusable service inside a locked transaction', async () => {
    const part = {
      id: 6,
      uuid: '66666666-6666-4666-8666-666666666666',
      name: 'Filtre',
      reference: 'OF-123',
      quantityOnHand: 0,
      quantityOnOrder: 0,
    };
    const repository = {
      findPartByUuid: jest.fn().mockImplementation(() => Promise.resolve(part)),
      withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
    };
    const auditService = { record: jest.fn() };
    const stockService = {
      apply: jest.fn().mockImplementation((item) => {
        item.quantityOnOrder = 4;
      }),
    };
    const service = new MaintenanceCatalogService(repository, auditService, {}, {}, stockService);

    await service.updatePartStock(
      part.uuid,
      { operation: 'order', quantity: 4, performedAt: '2026-08-20' },
      42,
    );

    expect(repository.findPartByUuid).toHaveBeenCalledWith(part.uuid, {
      transaction: { id: 'transaction' },
      lock: true,
    });
    expect(stockService.apply).toHaveBeenCalledWith(
      part,
      expect.objectContaining({
        stockableType: 'maintenancePart',
        operation: 'order',
        quantity: 4,
        performedAt: '2026-08-20',
        userId: 42,
      }),
      { transaction: { id: 'transaction' } },
    );
    expect(auditService.record).toHaveBeenCalledTimes(1);
  });

  it('maps the legacy exclusive status payload without exposing it to future adapters', () => {
    const service = new MaintenanceCatalogService({}, {}, {}, {}, {});

    expect(service.normalizeStockOperation({ stockStatus: 'ordered', stockQuantity: 3 })).toEqual({
      operation: 'adjust',
      quantityOnHand: 0,
      quantityOnOrder: 3,
    });
  });

  it('updates a part price and records its immutable history in one transaction', async () => {
    const transaction = { id: 'transaction' };
    const part = {
      id: 7,
      uuid: '77777777-7777-4777-8777-777777777777',
      name: 'Lame',
      reference: 'L-42',
      unitPrice: '10.00',
      toJSON() {
        return { ...this, toJSON: undefined };
      },
    };
    const repository = {
      withTransaction: jest.fn((callback) => callback(transaction)),
      findPartByUuid: jest.fn().mockImplementation(() => Promise.resolve(part)),
      updatePart: jest.fn((item, values) => Object.assign(item, values)),
      createPartPriceHistory: jest.fn(),
    };
    const auditService = { record: jest.fn() };
    const service = new MaintenanceCatalogService(repository, auditService);

    const result = await service.updatePartPrice(
      part.uuid,
      { unitPrice: 12.5, performedAt: '2026-08-19' },
      42,
    );

    expect(repository.createPartPriceHistory).toHaveBeenCalledWith(
      {
        maintenancePartId: part.id,
        previousUnitPrice: '10.00',
        unitPrice: '12.50',
        performedAt: '2026-08-19',
        changedBy: 42,
      },
      { transaction },
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRICE_UPDATE', entity: 'MAINTENANCE_PART' }),
      { transaction },
    );
    expect(result.unitPrice).toBe(12.5);
  });

  it('updates a part minimum stock and audits the dedicated action', async () => {
    const transaction = { id: 'transaction' };
    const part = {
      id: 8,
      uuid: '88888888-8888-4888-8888-888888888888',
      name: 'Filtre',
      reference: 'F-01',
      minimumStockQuantity: '1.00',
      toJSON() {
        return { ...this, toJSON: undefined };
      },
    };
    const repository = {
      withTransaction: jest.fn((callback) => callback(transaction)),
      findPartByUuid: jest.fn().mockImplementation(() => Promise.resolve(part)),
      updatePart: jest.fn((item, values) => Object.assign(item, values)),
    };
    const auditService = { record: jest.fn() };
    const service = new MaintenanceCatalogService(repository, auditService);

    const result = await service.updatePartMinimumStock(
      part.uuid,
      { minimumStockQuantity: 2.5 },
      42,
    );

    expect(repository.updatePart).toHaveBeenCalledWith(
      part,
      { minimumStockQuantity: 2.5, updatedBy: 42 },
      { transaction },
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MINIMUM_STOCK_UPDATE', entity: 'MAINTENANCE_PART' }),
      { transaction },
    );
    expect(result.minimumStockQuantity).toBe(2.5);
  });

  it('rejects future business dates before changing stock', async () => {
    const stockService = { apply: jest.fn() };
    const service = new MaintenanceCatalogService({}, {}, {}, {}, stockService);

    await expect(
      service.updatePartStock(
        '66666666-6666-4666-8666-666666666666',
        { operation: 'order', quantity: 1, performedAt: '2999-01-01' },
        42,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(stockService.apply).not.toHaveBeenCalled();
  });
});
