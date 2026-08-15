import { jest } from '@jest/globals';
import { Op } from 'sequelize';

import MaterialRepository from '../src/modules/materials/repository/material.repository.js';
import Material from '../src/modules/materials/model/material.model.js';
import MaintenanceTask from '../src/modules/maintenance/model/maintenance-task.model.js';

describe('MaterialRepository maintenance cascades', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads lightweight material options without catalogue associations', async () => {
    const findAll = jest.spyOn(Material, 'findAll').mockResolvedValue([]);

    await new MaterialRepository().findOptions();

    expect(findAll).toHaveBeenCalledWith({
      attributes: ['uuid', 'name', 'active'],
      where: {},
      order: [['name', 'ASC']],
      limit: 5,
      offset: 0,
    });
  });

  it('reactivates only plans whose update date matches a material deactivation marker', async () => {
    const update = jest.spyOn(MaintenanceTask, 'update').mockResolvedValue([1]);
    const repository = new MaterialRepository();
    const deactivatedAt = new Date('2026-07-30T08:00:00.000Z');

    await repository.reactivateMaintenanceTasks(5, [deactivatedAt, '2026-07-30T09:00:00.000Z'], 7, {
      transaction: { id: 'transaction' },
    });

    const [, options] = update.mock.calls[0];
    expect(options.where).toMatchObject({ materialId: 5, active: false });
    expect(options.where.updatedAt[Op.in]).toEqual([
      deactivatedAt,
      new Date('2026-07-30T09:00:00.000Z'),
    ]);
    expect(options.where.updatedAt[Op.lt]).toBeUndefined();
  });

  it('uses the exact material timestamp when deactivating its active plans', async () => {
    const update = jest.spyOn(MaintenanceTask, 'update').mockResolvedValue([2]);
    const repository = new MaterialRepository();
    const deactivatedAt = new Date('2026-07-30T08:00:00.000Z');

    await repository.deactivateMaintenanceTasks(5, deactivatedAt, 7, {
      transaction: { id: 'transaction' },
    });

    expect(update).toHaveBeenCalledWith(
      { active: false, updatedBy: 7, updatedAt: deactivatedAt },
      expect.objectContaining({
        where: { materialId: 5, active: true },
        silent: true,
        transaction: { id: 'transaction' },
      }),
    );
  });
});
