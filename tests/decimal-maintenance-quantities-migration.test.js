import { jest } from '@jest/globals';

import migration from '../migrations/20260825_add_decimal_maintenance_quantities.js';

describe('decimal maintenance quantities migration', () => {
  const between = Symbol('between');
  const Sequelize = {
    DECIMAL: jest.fn((precision, scale) => `DECIMAL(${precision},${scale})`),
    INTEGER: { UNSIGNED: 'INTEGER UNSIGNED' },
    Op: { between },
  };

  const queryInterface = () => ({
    changeColumn: jest.fn(),
    addConstraint: jest.fn(),
    sequelize: { query: jest.fn() },
  });

  it('upgrades plan, stock, movement and usage quantities to two decimals', async () => {
    const database = queryInterface();

    await migration.up(database, Sequelize);

    expect(database.changeColumn).toHaveBeenCalledTimes(8);
    expect(database.changeColumn).toHaveBeenCalledWith(
      'maintenance_task_parts',
      'quantity',
      expect.objectContaining({ type: 'DECIMAL(12,2)' }),
    );
    expect(database.changeColumn).toHaveBeenCalledWith(
      'inventory_stock_movements',
      'quantity_on_hand_change',
      expect.objectContaining({ type: 'DECIMAL(12,2)' }),
    );
    expect(database.addConstraint).toHaveBeenCalledWith(
      'maintenance_task_parts',
      expect.objectContaining({ name: 'chk_maintenance_task_parts_quantity' }),
    );
  });

  it('restores integer columns and removes decimal-only constraints on rollback', async () => {
    const database = queryInterface();

    await migration.down(database, Sequelize);

    expect(database.sequelize.query).toHaveBeenCalledWith(
      'ALTER TABLE `maintenance_task_parts` DROP CHECK `chk_maintenance_task_parts_quantity`',
    );
    expect(database.changeColumn).toHaveBeenCalledWith(
      'maintenance_task_parts',
      'quantity',
      expect.objectContaining({ type: 'INTEGER UNSIGNED' }),
    );
  });
});
