import { jest } from '@jest/globals';

import migration from '../migrations/20260815_zzzzzz_add_user_authorization_version.js';

describe('user authorization version migration', () => {
  it('adds a zero-based authorization version to existing users', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ id: {} }),
      addColumn: jest.fn().mockResolvedValue(undefined),
    };
    const Sequelize = { INTEGER: { UNSIGNED: 'INTEGER UNSIGNED' } };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith('users', 'authorization_version', {
      type: 'INTEGER UNSIGNED',
      allowNull: false,
      defaultValue: 0,
    });
  });

  it('removes only the authorization version on rollback', async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ authorization_version: {} }),
      removeColumn: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface);

    expect(queryInterface.removeColumn).toHaveBeenCalledWith('users', 'authorization_version');
  });
});
