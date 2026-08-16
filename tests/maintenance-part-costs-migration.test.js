import { jest } from '@jest/globals';

import migration from '../migrations/20260816_zz_add_maintenance_part_costs.js';

describe('maintenance part costs migration', () => {
  const Sequelize = {
    BIGINT: { UNSIGNED: 'BIGINT UNSIGNED' },
    DECIMAL: jest.fn((precision, scale) => `DECIMAL(${precision},${scale})`),
    UUID: 'UUID',
    STRING: jest.fn((length) => `STRING(${length})`),
    INTEGER: { UNSIGNED: 'INTEGER UNSIGNED' },
    DATEONLY: 'DATEONLY',
    DATE: 'DATE',
  };

  it('creates indexed immutable price and usage ledgers', async () => {
    const queryInterface = {
      addColumn: jest.fn(),
      createTable: jest.fn(),
      addIndex: jest.fn(),
      addConstraint: jest.fn(),
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'maintenance_parts',
      'unit_price',
      expect.objectContaining({ type: 'DECIMAL(12,2)', allowNull: false, defaultValue: 0 }),
    );
    expect(queryInterface.createTable).toHaveBeenCalledWith(
      'maintenance_part_price_history',
      expect.objectContaining({ previous_unit_price: expect.any(Object) }),
    );
    expect(queryInterface.createTable).toHaveBeenCalledWith(
      'maintenance_part_usages',
      expect.objectContaining({ total_cost: expect.any(Object), performed_at: expect.any(Object) }),
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      'maintenance_part_usages',
      ['performed_at'],
      { name: 'idx_maintenance_part_usages_performed' },
    );
  });

  it('removes ledgers before the current-price column on rollback', async () => {
    const queryInterface = { dropTable: jest.fn(), removeColumn: jest.fn() };

    await migration.down(queryInterface);

    expect(queryInterface.dropTable.mock.calls).toEqual([
      ['maintenance_part_usages'],
      ['maintenance_part_price_history'],
    ]);
    expect(queryInterface.removeColumn).toHaveBeenCalledWith('maintenance_parts', 'unit_price');
  });
});
