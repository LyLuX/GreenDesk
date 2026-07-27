import { jest } from '@jest/globals';

import ManufacturerService from '../src/modules/manufacturers/service/manufacturer.service.js';

describe('ManufacturerService', () => {
  it('restores a soft-deleted manufacturer when its name is created again', async () => {
    const deletedManufacturer = {
      uuid: 'manufacturer-uuid',
      name: 'ECHO',
      deletedAt: new Date(),
      toJSON() {
        return { uuid: this.uuid, name: this.name, deletedAt: this.deletedAt };
      },
    };
    const repository = {
      findByName: jest.fn().mockResolvedValue(deletedManufacturer),
      restore: jest.fn(),
      update: jest.fn().mockResolvedValue(deletedManufacturer),
      withTransaction: jest.fn((callback) => callback(undefined)),
    };
    const service = new ManufacturerService(repository, { record: jest.fn() });

    await expect(service.create({ name: 'ECHO' }, 7)).resolves.toEqual({
      uuid: 'manufacturer-uuid',
      name: 'ECHO',
      deletedAt: deletedManufacturer.deletedAt,
      hasLogo: false,
    });

    expect(repository.findByName).toHaveBeenCalledWith('ECHO', { withDeleted: true });
    expect(repository.restore).toHaveBeenCalledWith(deletedManufacturer, {
      transaction: undefined,
    });
    expect(repository.update).toHaveBeenCalledWith(
      deletedManufacturer,
      {
        name: 'ECHO',
        active: true,
        updatedBy: 7,
      },
      { transaction: undefined },
    );
  });

  it('propagates a renamed manufacturer to linked part compatibility fields', async () => {
    const transaction = { id: 'transaction' };
    const manufacturer = {
      id: 6,
      uuid: '66666666-6666-4666-8666-666666666666',
      name: 'Ancien nom',
      active: true,
      toJSON() {
        return { ...this };
      },
    };
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(manufacturer),
      findByName: jest.fn().mockResolvedValue(null),
      withTransaction: jest.fn((callback) => callback(transaction)),
      update: jest.fn((item, values) => Object.assign(item, values)),
      updatePartNames: jest.fn(),
    };
    const service = new ManufacturerService(repository, { record: jest.fn() });

    await service.update(manufacturer.uuid, { name: 'Nouveau nom' }, 42);

    expect(repository.updatePartNames).toHaveBeenCalledWith(manufacturer.id, 'Nouveau nom', {
      transaction,
    });
  });
});
