import { jest } from '@jest/globals';

import migration from '../migrations/20260730_zzz_normalize_lifecycle_cascades.js';

describe('lifecycle cascade normalization migration', () => {
  it('repairs active plans and installs the intended foreign keys', async () => {
    const query = jest.fn(async (sql) => {
      if (sql.includes('information_schema.KEY_COLUMN_USAGE')) {
        return [[{ name: 'legacy_constraint' }], {}];
      }
      if (sql.includes('COUNT(*)')) return [[{ count: 0 }], {}];
      return [[], {}];
    });
    const queryInterface = {
      sequelize: { query },
      removeConstraint: jest.fn(),
      changeColumn: jest.fn(),
      addConstraint: jest.fn(),
    };
    const Sequelize = { BIGINT: { UNSIGNED: 'BIGINT UNSIGNED' } };

    await migration.up(queryInterface, Sequelize);

    expect(
      query.mock.calls.some(
        ([sql]) =>
          sql.includes('UPDATE maintenance_tasks AS task') &&
          sql.includes('task.updated_at = material.updated_at'),
      ),
    ).toBe(true);
    expect(queryInterface.changeColumn).toHaveBeenCalledWith(
      'maintenance_tasks',
      'material_id',
      expect.objectContaining({ allowNull: false }),
    );
    expect(queryInterface.addConstraint).toHaveBeenCalledWith(
      'materials',
      expect.objectContaining({
        fields: ['category_id'],
        onDelete: 'SET NULL',
        references: { table: 'categories', field: 'id' },
      }),
    );
    expect(queryInterface.addConstraint).toHaveBeenCalledWith(
      'maintenance_tasks',
      expect.objectContaining({
        fields: ['material_id'],
        onDelete: 'CASCADE',
        references: { table: 'materials', field: 'id' },
      }),
    );
    expect(queryInterface.addConstraint).toHaveBeenCalledWith(
      'maintenance_history',
      expect.objectContaining({
        fields: ['maintenance_task_id'],
        onDelete: 'CASCADE',
      }),
    );
  });

  it('stops before making a required relation non-null when legacy nulls remain', async () => {
    const queryInterface = {
      sequelize: {
        query: jest.fn(async (sql) =>
          sql.includes('material_files') && sql.includes('COUNT(*)')
            ? [[{ count: 1 }], {}]
            : [[], {}],
        ),
      },
      removeConstraint: jest.fn(),
      changeColumn: jest.fn(),
      addConstraint: jest.fn(),
    };

    await expect(
      migration.up(queryInterface, { BIGINT: { UNSIGNED: 'BIGINT UNSIGNED' } }),
    ).rejects.toThrow('material_files.material_id');
    expect(queryInterface.changeColumn).not.toHaveBeenCalled();
  });
});
