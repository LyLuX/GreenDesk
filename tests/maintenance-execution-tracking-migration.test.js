import { jest } from '@jest/globals';

import migration from '../migrations/20260815_zzz_add_maintenance_execution_tracking.js';

describe('maintenance execution tracking migration', () => {
  const Sequelize = {
    STRING: jest.fn((length) => `STRING(${length})`),
    JSON: 'JSON',
  };

  it('adds the execution type and skipped-parts snapshot', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({}),
      addColumn: jest.fn(),
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'maintenance_history',
      'execution_type',
      expect.objectContaining({ allowNull: false, defaultValue: 'standard' }),
    );
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'maintenance_history',
      'parts_snapshot',
      expect.objectContaining({ allowNull: true, type: 'JSON' }),
    );
  });

  it('removes both tracking columns on rollback', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ execution_type: {}, parts_snapshot: {} }),
      removeColumn: jest.fn(),
    };

    await migration.down(queryInterface);

    expect(queryInterface.removeColumn.mock.calls).toEqual([
      ['maintenance_history', 'parts_snapshot'],
      ['maintenance_history', 'execution_type'],
    ]);
  });
});
