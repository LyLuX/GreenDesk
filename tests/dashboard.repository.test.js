import { jest } from '@jest/globals';

import DashboardRepository from '../src/modules/dashboard/repository/dashboard.repository.js';
import MaintenancePart from '../src/modules/maintenance/model/maintenance-part.model.js';

describe('DashboardRepository', () => {
  afterEach(() => jest.restoreAllMocks());

  it('aggregates both current maintenance stock values in one query', async () => {
    const findOne = jest
      .spyOn(MaintenancePart, 'findOne')
      .mockResolvedValue({ onHand: '450.75', onOrder: '120.50' });

    await expect(new DashboardRepository().getMaintenanceStockValues()).resolves.toEqual({
      onHand: '450.75',
      onOrder: '120.50',
    });

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne.mock.calls[0][0].attributes.map((attribute) => attribute[1])).toEqual([
      'onHand',
      'onOrder',
    ]);
    expect(findOne.mock.calls[0][0]).toEqual(expect.objectContaining({ raw: true }));
  });
});
