import { jest } from '@jest/globals';

import CategoryService from '../src/modules/categories/service/category.service.js';

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

describe('CategoryService update', () => {
  it('allows an update when the name lookup returns the category being edited', async () => {
    const item = restoredItem('Arbres');
    item.deletedAt = null;
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(item),
      findByName: jest.fn().mockResolvedValue(item),
      update: jest.fn((category, values) => Object.assign(category, values)),
    };
    const service = new CategoryService(repository, { record: jest.fn() });

    await expect(service.update(item.uuid, { name: 'ARBRES' }, 3)).resolves.toMatchObject({
      name: 'ARBRES',
    });
  });
});
