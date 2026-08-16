import { jest } from '@jest/globals';

import DashboardService from '../src/modules/dashboard/service/dashboard.service.js';

describe('DashboardService', () => {
  it('maps repository counts to the public summary shape', async () => {
    const currentYear = new Date().getUTCFullYear();
    const repository = {
      getCounts: jest.fn().mockResolvedValue({
        materialsTotal: 8,
        materialsActive: 6,
        materialsInactive: 2,
        categoriesTotal: 3,
        manufacturersTotal: 2,
        totalPurchaseValue: 1600,
        averageCost: 200,
        averageAge: 3.5,
        maintenanceCosts: [
          { year: currentYear, total: '125.50' },
          { year: currentYear - 1, total: '80.00' },
        ],
        maintenanceTasks: [
          { uuid: 'today', status: 'dueToday' },
          { uuid: 'overdue-1', status: 'overdue' },
          { uuid: 'overdue-2', status: 'overdue' },
          { uuid: 'upcoming', status: 'upcoming' },
          { uuid: 'wear-based', status: 'wearBased' },
        ],
      }),
    };
    const maintenanceService = {
      toPublic: jest.fn((task) => task),
    };
    await expect(
      new DashboardService(repository, maintenanceService).getSummary(),
    ).resolves.toEqual({
      materials: { total: 8, active: 6, inactive: 2 },
      categories: { total: 3 },
      manufacturers: { total: 2 },
      fleet: { totalPurchaseValue: 1600, averageCost: 200, averageAge: 3.5 },
      maintenance: {
        today: 1,
        overdue: 2,
        upcoming: 1,
        wearBased: 1,
        costs: [
          { year: currentYear, total: 125.5 },
          { year: currentYear - 1, total: 80 },
          { year: currentYear - 2, total: 0 },
        ],
        items: {
          today: [{ uuid: 'today', status: 'dueToday' }],
          overdue: [
            { uuid: 'overdue-1', status: 'overdue' },
            { uuid: 'overdue-2', status: 'overdue' },
          ],
          upcoming: [{ uuid: 'upcoming', status: 'upcoming' }],
          wearBased: [{ uuid: 'wear-based', status: 'wearBased' }],
        },
      },
    });
    expect(maintenanceService.toPublic).toHaveBeenCalledTimes(5);
    expect(repository.getCounts).toHaveBeenCalledWith({ includeMaintenance: true });
  });

  it('omits maintenance data when the caller lacks maintenance access', async () => {
    const repository = {
      getCounts: jest.fn().mockResolvedValue({
        materialsTotal: 8,
        materialsActive: 6,
        materialsInactive: 2,
        categoriesTotal: 3,
        manufacturersTotal: 2,
        totalPurchaseValue: 1600,
        averageCost: 200,
        averageAge: 3.5,
      }),
    };
    const maintenanceService = { toPublic: jest.fn() };

    await expect(
      new DashboardService(repository, maintenanceService).getSummary({
        includeMaintenance: false,
      }),
    ).resolves.toEqual({
      materials: { total: 8, active: 6, inactive: 2 },
      categories: { total: 3 },
      manufacturers: { total: 2 },
      fleet: { totalPurchaseValue: 1600, averageCost: 200, averageAge: 3.5 },
    });
    expect(repository.getCounts).toHaveBeenCalledWith({ includeMaintenance: false });
    expect(maintenanceService.toPublic).not.toHaveBeenCalled();
  });
});
