import { jest } from '@jest/globals';

import DashboardService from '../src/modules/dashboard/service/dashboard.service.js';

describe('DashboardService', () => {
  it('maps repository counts to the public summary shape', async () => {
    const repository = {
      getCounts: jest.fn().mockResolvedValue({
        materialsTotal: 8,
        materialsActive: 6,
        materialsInactive: 2,
        categoriesTotal: 3,
        propertiesTotal: 4,
        brandsTotal: 2,
        totalValue: 1500,
        averageCost: 200,
        averageAge: 3.5,
      }),
    };
    await expect(new DashboardService(repository).getSummary()).resolves.toEqual({
      materials: { total: 8, active: 6, inactive: 2 },
      categories: { total: 3 },
      properties: { total: 4 },
      brands: { total: 2 },
      fleet: { totalValue: 1500, averageCost: 200, averageAge: 3.5 },
    });
  });
});
