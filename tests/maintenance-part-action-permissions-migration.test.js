import { jest } from '@jest/globals';

import migration from '../migrations/20260816_zzz_add_maintenance_part_action_permissions.js';

const permissionNames = [
  'maintenance.parts.stock.adjust_on_hand',
  'maintenance.parts.stock.adjust_on_order',
  'maintenance.parts.stock.order',
  'maintenance.parts.stock.receive',
  'maintenance.parts.price.update',
];

describe('maintenance part action permission migration', () => {
  it('creates every permission, copies update grants and invalidates affected sessions', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([[], {}])
      .mockResolvedValue([]);
    const queryInterface = {
      sequelize: { query },
      bulkInsert: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryInterface);

    expect(queryInterface.bulkInsert.mock.calls[0][1].map(({ name }) => name)).toEqual(
      permissionNames,
    );
    const grantQueries = query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT IGNORE INTO role_permissions'),
    );
    expect(grantQueries).toHaveLength(permissionNames.length);
    expect(grantQueries.map(([, options]) => options.replacements.targetName)).toEqual(
      permissionNames,
    );
    expect(query.mock.calls.at(-1)[0]).toContain('authorization_version');
  });

  it('invalidates sessions and removes only the granular permissions on rollback', async () => {
    const queryInterface = {
      sequelize: { query: jest.fn().mockResolvedValue(undefined) },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface);

    expect(queryInterface.sequelize.query.mock.calls[0][0]).toContain('authorization_version');
    expect(queryInterface.sequelize.query.mock.calls[1][0]).toContain('DELETE grants');
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith('permissions', {
      name: permissionNames,
    });
  });
});
