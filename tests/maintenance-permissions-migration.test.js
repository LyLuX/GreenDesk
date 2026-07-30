import { jest } from '@jest/globals';

import migration from '../migrations/20260730_add_maintenance_catalog_permissions.js';
import planMigration from '../migrations/20260730_zz_add_maintenance_plan_permissions.js';

const expectedNames = [
  'maintenance.operations.read',
  'maintenance.operations.create',
  'maintenance.operations.update',
  'maintenance.operations.delete',
  'maintenance.parts.read',
  'maintenance.parts.create',
  'maintenance.parts.update',
  'maintenance.parts.delete',
];

describe('maintenance catalogue permission migration', () => {
  it('creates every permission and copies existing plan grants', async () => {
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

    expect(queryInterface.bulkInsert).toHaveBeenCalledTimes(1);
    expect(queryInterface.bulkInsert.mock.calls[0][1].map(({ name }) => name)).toEqual(
      expectedNames,
    );
    const grantQueries = query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT IGNORE INTO role_permissions'),
    );
    expect(grantQueries).toHaveLength(expectedNames.length);
    expect(grantQueries.map(([, options]) => options.replacements.targetName)).toEqual(
      expectedNames,
    );
  });

  it('removes only the dedicated catalogue permissions on rollback', async () => {
    const queryInterface = {
      sequelize: { query: jest.fn().mockResolvedValue(undefined) },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface);

    expect(queryInterface.bulkDelete).toHaveBeenCalledWith('permissions', {
      name: expectedNames,
    });
  });
});

describe('maintenance plan permission migration', () => {
  const planPermissionNames = [
    'maintenance.read',
    'maintenance.create',
    'maintenance.update',
    'maintenance.delete',
    'maintenance.execute',
  ];

  it('restores deleted permissions and creates every missing plan permission', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([[], {}]);
    const queryInterface = {
      sequelize: { query },
      bulkInsert: jest.fn().mockResolvedValue(undefined),
    };

    await planMigration.up(queryInterface);

    expect(query.mock.calls[0][0]).toContain('deleted_at = NULL');
    expect(queryInterface.bulkInsert.mock.calls[0][1].map(({ name }) => name)).toEqual(
      planPermissionNames,
    );
  });

  it('removes plan grants before the permissions on rollback', async () => {
    const queryInterface = {
      sequelize: { query: jest.fn().mockResolvedValue(undefined) },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await planMigration.down(queryInterface);

    expect(queryInterface.sequelize.query.mock.calls[0][0]).toContain('DELETE grants');
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith('permissions', {
      name: planPermissionNames,
    });
  });
});
