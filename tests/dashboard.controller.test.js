import { jest } from '@jest/globals';

import DashboardController from '../src/modules/dashboard/controller/dashboard.controller.js';

describe('DashboardController permissions', () => {
  it.each([
    [[], [], false, false, false],
    [[], ['maintenance.read'], true, false, false],
    [[], ['maintenance.parts.read'], false, true, false],
    [[], ['dashboard.read.financial'], false, false, true],
    [
      [],
      ['maintenance.read', 'maintenance.parts.read', 'dashboard.read.financial'],
      true,
      true,
      true,
    ],
    [['ADMIN'], [], true, true, true],
  ])(
    'requests only the dashboard sections authorized for the user',
    async (roles, permissions, includeMaintenance, includeLowStock, includeFinancial) => {
      const service = {
        getSummary: jest.fn().mockResolvedValue({ materials: { total: 0 } }),
      };
      const response = { json: jest.fn() };
      const controller = new DashboardController(service);

      await controller.summary({ user: { roles, permissions } }, response);

      expect(service.getSummary).toHaveBeenCalledWith({
        includeMaintenance,
        includeLowStock,
        includeFinancial,
      });
      expect(response.json).toHaveBeenCalledWith({
        success: true,
        data: { materials: { total: 0 } },
      });
    },
  );
});
