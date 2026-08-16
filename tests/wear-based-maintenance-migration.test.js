import { jest } from '@jest/globals';

import migration from '../migrations/20260816_add_wear_based_maintenance.js';

describe('wear-based maintenance migration', () => {
  const Sequelize = { DATEONLY: 'DATEONLY' };

  it('allows plans without a calculated next date', async () => {
    const queryInterface = { changeColumn: jest.fn().mockResolvedValue(undefined) };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.changeColumn).toHaveBeenCalledWith(
      'maintenance_tasks',
      'next_maintenance_date',
      { type: 'DATEONLY', allowNull: true },
    );
  });

  it('restores a date before making the column mandatory on rollback', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryInterface = {
      sequelize: { query },
      changeColumn: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface, Sequelize);

    expect(query.mock.calls[0][0]).toContain('SET next_maintenance_date = last_maintenance_date');
    expect(queryInterface.changeColumn).toHaveBeenCalledWith(
      'maintenance_tasks',
      'next_maintenance_date',
      { type: 'DATEONLY', allowNull: false },
    );
  });
});
