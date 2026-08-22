import { jest } from '@jest/globals';

import migration from '../migrations/20260822_zzzzz_add_dashboard_financial_permission.js';

const permissionName = 'dashboard.read.financial';

describe('dashboard financial permission migration', () => {
  it('creates the permission without granting it to existing dashboard roles', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([[], {}]);
    const queryInterface = {
      sequelize: { query },
      bulkInsert: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryInterface);

    expect(queryInterface.bulkInsert).toHaveBeenCalledWith(
      'permissions',
      expect.arrayContaining([expect.objectContaining({ name: permissionName })]),
    );
    expect(query.mock.calls.some(([sql]) => sql.includes('role_permissions'))).toBe(false);
  });

  it('invalidates affected sessions and removes grants before rollback', async () => {
    const queryInterface = {
      sequelize: { query: jest.fn().mockResolvedValue(undefined) },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface);

    expect(queryInterface.sequelize.query.mock.calls[0][0]).toContain('authorization_version');
    expect(queryInterface.sequelize.query.mock.calls[1][0]).toContain('DELETE grants');
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith('permissions', {
      name: permissionName,
    });
  });
});
