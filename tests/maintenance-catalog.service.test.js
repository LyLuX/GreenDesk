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
      },
      42,
    );

    expect(repository.createPart).toHaveBeenCalledWith(
      expect.objectContaining({
        manufacturerId: manufacturer.id,
        manufacturer: manufacturer.name,
        supplierId: supplier.id,
        supplier: supplier.name,
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

  it('stores ordered quantities and clears them when a part must be ordered again', async () => {
    const part = {
      id: 6,
      uuid: '66666666-6666-4666-8666-666666666666',
      name: 'Filtre',
      reference: 'OF-123',
      stockStatus: 'toOrder',
      stockQuantity: 0,
    };
    const repository = {
      findPartByUuid: jest.fn().mockImplementation(() => Promise.resolve(part)),
      withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
      updatePart: jest.fn((item, values) => Object.assign(item, values)),
    };
    const auditService = { record: jest.fn() };
    const service = new MaintenanceCatalogService(repository, auditService);

    await service.updatePartStock(part.uuid, { stockStatus: 'ordered', stockQuantity: 4 }, 42);
    expect(part).toEqual(expect.objectContaining({ stockStatus: 'ordered', stockQuantity: 4 }));

    await service.updatePartStock(part.uuid, { stockStatus: 'toOrder', stockQuantity: 4 }, 42);
    expect(part).toEqual(expect.objectContaining({ stockStatus: 'toOrder', stockQuantity: 0 }));
    expect(auditService.record).toHaveBeenCalledTimes(2);
  });

  it('requires a positive quantity for ordered or workshop-stock parts', async () => {
    const part = {
      id: 7,
      uuid: '77777777-7777-4777-8777-777777777777',
      name: 'Courroie',
      reference: 'BELT-7',
      stockStatus: 'toOrder',
      stockQuantity: 0,
    };
    const repository = {
      findPartByUuid: jest.fn().mockResolvedValue(part),
      withTransaction: jest.fn((callback) => callback(undefined)),
      updatePart: jest.fn(),
    };
    const service = new MaintenanceCatalogService(repository, { record: jest.fn() });

    await expect(
      service.updatePartStock(part.uuid, { stockStatus: 'inStock', stockQuantity: 0 }, 42),
    ).rejects.toThrow('quantité positive');
    expect(repository.updatePart).not.toHaveBeenCalled();
  });
});
