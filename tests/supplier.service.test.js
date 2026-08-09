import { jest } from '@jest/globals';

import SupplierService from '../src/modules/suppliers/service/supplier.service.js';

describe('SupplierService', () => {
  const transaction = { id: 'transaction' };
  it('allows an update when the name lookup returns the supplier being edited', async () => {
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
      findByName: jest.fn().mockResolvedValue(supplier),
      withTransaction: jest.fn((callback) => callback(transaction)),
      update: jest.fn((item, values) => Object.assign(item, values)),
      updatePartNames: jest.fn(),
    };
    const service = new SupplierService(repository, { record: jest.fn() });

    await expect(service.update(supplier.uuid, { name: 'PIÈCES PRO' }, 42)).resolves.toMatchObject({
      name: 'PIÈCES PRO',
    });
  });

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
      withTransaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new SupplierService(repository, {});

    await expect(service.remove(supplier.uuid, 42)).rejects.toThrow('encore utilisé par une pièce');
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
