import { jest } from '@jest/globals';
import { Op } from 'sequelize';

import MaintenanceTask from '../src/modules/maintenance/model/maintenance-task.model.js';
import MaintenanceRepository from '../src/modules/maintenance/repository/maintenance.repository.js';

describe('MaintenanceRepository order list', () => {
  afterEach(() => jest.restoreAllMocks());

  it('loads workshop and ordered quantities required to calculate uncovered needs', async () => {
    const findAll = jest.spyOn(MaintenanceTask, 'findAll').mockResolvedValue([]);
    const repository = new MaintenanceRepository();

    await repository.findForOrderList({ through: '2026-09-08' });

    const query = findAll.mock.calls[0][0];
    const parts = query.include.find((item) => item.as === 'parts');
    expect(parts.attributes).toEqual(
      expect.arrayContaining(['quantityOnHand', 'quantityOnOrder', 'unitPrice']),
    );
  });

  it('keeps calendar horizons separate from wear-based plans', async () => {
    const findAll = jest.spyOn(MaintenanceTask, 'findAll').mockResolvedValue([]);
    const repository = new MaintenanceRepository();

    await repository.findForOrderList({ through: '2026-09-08' });

    expect(findAll.mock.calls[0][0].where.intervalDays).toEqual({ [Op.gt]: 0 });

    await repository.findForOrderList({ status: 'wearBased' });

    expect(findAll.mock.calls[1][0].where[Op.and][0].val).toContain(
      'MaintenanceTask.interval_days = 0',
    );
  });

  it('filters the maintenance list to wear-based plans', async () => {
    const findAndCountAll = jest
      .spyOn(MaintenanceTask, 'findAndCountAll')
      .mockResolvedValue({ count: 0, rows: [] });
    const repository = new MaintenanceRepository();

    await repository.findAll({ status: 'wearBased' });

    const query = findAndCountAll.mock.calls[0][0];
    expect(query.where[Op.and][0].val).toContain('MaintenanceTask.interval_days = 0');
  });
});
