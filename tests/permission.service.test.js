import { jest } from '@jest/globals';

import PermissionService from '../src/modules/permissions/service/permission.service.js';

describe('PermissionService audit', () => {
  it('records permission updates in the same transaction', async () => {
    const transaction = { id: 'transaction' };
    const permission = {
      uuid: 'd0fd8cdc-74d0-4f58-af27-6c181e05895d',
      name: 'history.fleet.read',
      description: 'Avant',
      toJSON() {
        return { uuid: this.uuid, name: this.name, description: this.description };
      },
    };
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(permission),
      update: jest.fn(async (item, values) => Object.assign(item, values)),
      withTransaction: jest.fn((callback) => callback(transaction)),
    };
    const auditService = { record: jest.fn() };
    const service = new PermissionService(repository, auditService);

    await service.update(permission.uuid, { description: 'Après' }, 42);

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        action: 'UPDATE',
        entity: 'PERMISSION',
        oldValues: expect.objectContaining({ description: 'Avant' }),
        newValues: expect.objectContaining({ description: 'Après' }),
      }),
      { transaction },
    );
  });
});
