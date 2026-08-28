import { jest } from '@jest/globals';
import { DataTypes, Op } from 'sequelize';

import migration from '../migrations/20260828_add_maintenance_part_minimum_stock.js';

const permissionName = 'maintenance.parts.stock.minimum.update';
const Sequelize = { DECIMAL: DataTypes.DECIMAL, Op };

describe('maintenance part minimum stock migration', () => {
  it('adds and backfills the minimum stock before creating its dedicated permission', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([[], {}])
      .mockResolvedValue(undefined);
    const queryInterface = {
      addColumn: jest.fn().mockResolvedValue(undefined),
      addConstraint: jest.fn().mockResolvedValue(undefined),
      bulkInsert: jest.fn().mockResolvedValue(undefined),
      sequelize: { query },
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'maintenance_parts',
      'minimum_stock_quantity',
      expect.objectContaining({ allowNull: false, defaultValue: 1 }),
    );
    expect(query.mock.calls[0][0]).toBe('UPDATE maintenance_parts SET minimum_stock_quantity = 1');
    expect(queryInterface.addConstraint).toHaveBeenCalledWith(
      'maintenance_parts',
      expect.objectContaining({
        fields: ['minimum_stock_quantity'],
        name: 'chk_maintenance_parts_minimum_stock_quantity',
      }),
    );
    expect(queryInterface.bulkInsert.mock.calls[0][1]).toEqual([
      expect.objectContaining({ name: permissionName }),
    ]);
    expect(
      query.mock.calls.find(([sql]) => sql.includes('INSERT IGNORE INTO role_permissions'))[1]
        .replacements,
    ).toEqual(
      expect.objectContaining({
        sourceName: 'maintenance.parts.update',
        targetName: permissionName,
      }),
    );
    expect(query.mock.calls.at(-1)[0]).toContain('authorization_version');
  });

  it('removes only the new permission, constraint and column on rollback', async () => {
    const queryInterface = {
      bulkDelete: jest.fn().mockResolvedValue(undefined),
      removeConstraint: jest.fn().mockResolvedValue(undefined),
      removeColumn: jest.fn().mockResolvedValue(undefined),
      sequelize: { query: jest.fn().mockResolvedValue(undefined) },
    };

    await migration.down(queryInterface);

    expect(queryInterface.bulkDelete).toHaveBeenCalledWith('permissions', {
      name: permissionName,
    });
    expect(queryInterface.removeConstraint).toHaveBeenCalledWith(
      'maintenance_parts',
      'chk_maintenance_parts_minimum_stock_quantity',
    );
    expect(queryInterface.removeColumn).toHaveBeenCalledWith(
      'maintenance_parts',
      'minimum_stock_quantity',
    );
  });
});
