import { jest } from '@jest/globals';

import migration from '../migrations/20260823_zzzzz_add_deleted_user_read_permission.js';

describe('deleted-user read permission migration', () => {
  it('creates the permission, grants it to ADMIN and refreshes active authorizations', async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);
    const queryInterface = {
      sequelize: { query },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryInterface);

    expect(query.mock.calls[0][0]).toContain('INSERT INTO permissions');
    expect(query.mock.calls[0][1].replacements).toMatchObject({
      name: 'users.deleted.read',
      description: 'Consulter les comptes utilisateur supprimés.',
    });
    expect(query.mock.calls[1][0]).toContain("roles.name = 'ADMIN'");
    expect(query.mock.calls[1][1].replacements.permissionName).toBe('users.deleted.read');
    expect(query.mock.calls[2][0]).toContain('authorization_version');
  });

  it('removes its grants and permission on rollback', async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);
    const queryInterface = {
      sequelize: { query },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface);

    expect(query.mock.calls[0][0]).toContain('authorization_version');
    expect(query.mock.calls[1][0]).toContain('DELETE grants');
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith('permissions', {
      name: 'users.deleted.read',
    });
  });
});
