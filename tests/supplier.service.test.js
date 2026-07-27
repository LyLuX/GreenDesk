import { jest } from '@jest/globals';

import SupplierService from '../src/modules/suppliers/service/supplier.service.js';

describe('SupplierService', () => {
  it('refuses to delete a supplier still referenced by a part', async () => {
    const supplier = {
      id: 7,
      uuid: '77777777-7777-4777-8777-777777777777',
      name: 'Pièces Pro',
      toJSON() {
        return { ...this };
      },
    };
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(supplier),
      countParts: jest.fn().mockResolvedValue(1),
      delete: jest.fn(),
    };
    const service = new SupplierService(repository, {});

    await expect(service.remove(supplier.uuid, 42)).rejects.toThrow('encore utilisé par une pièce');
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
