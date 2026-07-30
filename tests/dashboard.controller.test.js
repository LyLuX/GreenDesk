import { jest } from '@jest/globals';

import DashboardController from '../src/modules/dashboard/controller/dashboard.controller.js';

describe('DashboardController maintenance permissions', () => {
  it.each([
    [[], [], false],
    [[], ['maintenance.read'], true],
    [['ADMIN'], [], true],
  ])(
    'requests only the dashboard sections authorized for the user',
    async (roles, permissions, includeMaintenance) => {
      const service = {
        getSummary: jest.fn().mockResolvedValue({ materials: { total: 0 } }),
      };
      const response = { json: jest.fn() };
      const controller = new DashboardController(service);

      await controller.summary({ user: { roles, permissions } }, response);

      expect(service.getSummary).toHaveBeenCalledWith({ includeMaintenance });
      expect(response.json).toHaveBeenCalledWith({
        success: true,
        data: { materials: { total: 0 } },
      });
    },
  );
});
