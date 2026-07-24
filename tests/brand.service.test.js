import { jest } from '@jest/globals';

import BrandService from '../src/modules/brands/service/brand.service.js';

describe('BrandService', () => {
  it('restores a soft-deleted brand when its name is created again', async () => {
    const deletedBrand = { uuid: 'brand-uuid', deletedAt: new Date() };
    const repository = {
      findByName: jest.fn().mockResolvedValue(deletedBrand),
      restore: jest.fn(),
      update: jest.fn().mockResolvedValue(deletedBrand),
    };
    const service = new BrandService(repository, { record: jest.fn() });

    await expect(service.create({ name: 'ECHO' }, 7)).resolves.toBe(deletedBrand);

    expect(repository.findByName).toHaveBeenCalledWith('ECHO', { withDeleted: true });
    expect(repository.restore).toHaveBeenCalledWith(deletedBrand);
    expect(repository.update).toHaveBeenCalledWith(deletedBrand, {
      name: 'ECHO',
      active: true,
      updatedBy: 7,
    });
  });
});
