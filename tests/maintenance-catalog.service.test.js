import { jest } from '@jest/globals';

import MaintenanceCatalogService from '../src/modules/maintenance/service/maintenance-catalog.service.js';

describe('MaintenanceCatalogService', () => {
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
});
