import { jest } from '@jest/globals';

import migration from '../migrations/20260823_zzzzzz_add_user_restore_permission.js';

describe('user restore permission migration', () => {
  it('creates the independent permission, grants it to ADMIN and refreshes authorizations', async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);
    const queryInterface = {
      sequelize: { query },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryInterface);

    expect(query.mock.calls[0][1].bind).toMatchObject({
      name: 'users.restore',
      description: 'Restaurer des comptes utilisateur supprimés.',
    });
    expect(query.mock.calls[1][0]).toContain("roles.name = 'ADMIN'");
    expect(query.mock.calls[1][1].bind.permissionName).toBe('users.restore');
    expect(query.mock.calls[2][0]).toContain('authorization_version');
  });

  it('removes only its grants and permission on rollback', async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);
    const queryInterface = {
      sequelize: { query },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface);

    expect(query.mock.calls[0][0]).toContain('authorization_version');
    expect(query.mock.calls[1][0]).toContain('DELETE grants');
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith('permissions', {
      name: 'users.restore',
    });
  });
});
