import { jest } from '@jest/globals';

import MaintenanceTask from '../src/modules/maintenance/model/maintenance-task.model.js';
import MaintenanceRepository from '../src/modules/maintenance/repository/maintenance.repository.js';

describe('MaintenanceRepository order list', () => {
  afterEach(() => jest.restoreAllMocks());

  it('loads the stock state and quantity required to calculate uncovered needs', async () => {
    const findAll = jest.spyOn(MaintenanceTask, 'findAll').mockResolvedValue([]);
    const repository = new MaintenanceRepository();

    await repository.findForOrderList({ through: '2026-09-08' });

    const query = findAll.mock.calls[0][0];
    const parts = query.include.find((item) => item.as === 'parts');
    expect(parts.attributes).toEqual(expect.arrayContaining(['stockStatus', 'stockQuantity']));
  });
});
