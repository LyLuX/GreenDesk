import { jest } from '@jest/globals';

import DashboardController from '../src/modules/dashboard/controller/dashboard.controller.js';

describe('DashboardController permissions', () => {
  it.each([
    [[], [], false, false],
    [[], ['maintenance.read'], true, false],
    [[], ['dashboard.read.financial'], false, true],
    [[], ['maintenance.read', 'dashboard.read.financial'], true, true],
    [['ADMIN'], [], true, true],
  ])(
    'requests only the dashboard sections authorized for the user',
    async (roles, permissions, includeMaintenance, includeFinancial) => {
      const service = {
        getSummary: jest.fn().mockResolvedValue({ materials: { total: 0 } }),
      };
      const response = { json: jest.fn() };
      const controller = new DashboardController(service);

      await controller.summary({ user: { roles, permissions } }, response);

      expect(service.getSummary).toHaveBeenCalledWith({ includeMaintenance, includeFinancial });
      expect(response.json).toHaveBeenCalledWith({
        success: true,
        data: { materials: { total: 0 } },
      });
    },
  );
});
