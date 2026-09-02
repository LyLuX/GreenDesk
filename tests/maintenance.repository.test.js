import { jest } from '@jest/globals';
import { Op } from 'sequelize';

import sequelize from '../src/config/database.js';
import { initializeModels } from '../src/core/database/models.js';
import MaintenanceTask from '../src/modules/maintenance/model/maintenance-task.model.js';
import MaintenanceRepository from '../src/modules/maintenance/repository/maintenance.repository.js';

initializeModels();

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

  it('sorts dated plans first by deadline, priority, title and id', async () => {
    const findAndCountAll = jest
      .spyOn(MaintenanceTask, 'findAndCountAll')
      .mockResolvedValue({ count: 0, rows: [] });
    const repository = new MaintenanceRepository();

    await repository.findAll();

    const query = findAndCountAll.mock.calls[0][0];
    expect(query.order[0][0].val).toBe('nextMaintenanceDate IS NULL');
    expect(query.order.slice(1)).toEqual([
      ['next_maintenance_date', 'ASC'],
      ['priority', 'DESC'],
      ['title', 'ASC'],
      ['id', 'ASC'],
    ]);
  });

  it('uses the selected date alias when Sequelize paginates through a subquery', async () => {
    const statements = [];
    jest.spyOn(sequelize, 'query').mockImplementation(async (sql, options) => {
      statements.push(sql);
      return options?.plain ? { count: 0 } : [];
    });
    const repository = new MaintenanceRepository();

    await repository.findAll();

    const paginatedSelect = statements.find((sql) => sql.includes('LIMIT 0, 5'));
    expect(paginatedSelect).toContain('ORDER BY nextMaintenanceDate IS NULL ASC');
    expect(paginatedSelect).not.toContain('MaintenanceTask.next_maintenance_date IS NULL');
  });

  it('loads all active plans or the exact status for maintenance sheets', async () => {
    const findAll = jest.spyOn(MaintenanceTask, 'findAll').mockResolvedValue([]);
    const repository = new MaintenanceRepository();

    await repository.findForMaintenanceSheets();
    expect(findAll.mock.calls[0][0].where.active).toBe(true);
    expect(findAll.mock.calls[0][0].where[Op.and]).toBeUndefined();

    await repository.findForMaintenanceSheets({ status: 'dueToday' });
    expect(findAll.mock.calls[1][0].where[Op.and][0].val).toContain(
      'MaintenanceTask.next_maintenance_date',
    );
  });
});
