import { jest } from '@jest/globals';

import migration from '../migrations/20260823_zzzzzzz_add_user_last_login_sort_index.js';

describe('user last-login sort index migration', () => {
  it('adds the composite index used by paranoid user pagination', async () => {
    const queryInterface = {
      addIndex: jest.fn().mockResolvedValue(undefined),
      removeIndex: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryInterface);

    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      'users',
      ['deleted_at', 'last_login_at', 'id'],
      { name: 'idx_users_deleted_last_login' },
    );
  });

  it('removes the index on rollback', async () => {
    const queryInterface = {
      addIndex: jest.fn().mockResolvedValue(undefined),
      removeIndex: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface);

    expect(queryInterface.removeIndex).toHaveBeenCalledWith(
      'users',
      'idx_users_deleted_last_login',
    );
  });
});
