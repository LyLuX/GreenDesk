import { jest } from '@jest/globals';

import CategoryService from '../src/modules/categories/service/category.service.js';
import PropertyService from '../src/modules/properties/service/property.service.js';

const restoredItem = (name) => ({
  uuid: `${name}-uuid`,
  name,
  deletedAt: new Date(),
  toJSON() {
    return { uuid: this.uuid, name: this.name, deletedAt: this.deletedAt };
  },
});

const restorationCases = [
  { Service: CategoryService, entity: 'CATEGORY', values: { name: 'Arbres' } },
  { Service: PropertyService, entity: 'PROPERTY', values: { name: 'Surface', type: 'number' } },
];

describe.each(restorationCases)('$entity restoration', ({ Service, entity, values }) => {
  it('restores a soft-deleted reference instead of creating a duplicate', async () => {
    const item = restoredItem(values.name);
    const repository = {
      findByName: jest.fn().mockResolvedValue(item),
      restore: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };
    const auditService = { record: jest.fn() };
    const service = new Service(repository, auditService);

    await service.create(values, 3);

    expect(repository.restore).toHaveBeenCalledWith(item);
    expect(repository.update).toHaveBeenCalledWith(
      item,
      expect.objectContaining({ active: true, updatedBy: 3 }),
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESTORE', entity }),
    );
  });
});
