import { jest } from '@jest/globals';

import migration from '../migrations/20260827_add_deleted_record_permissions.js';

describe('deleted record permissions migration', () => {
  it('renames user restoration and grants all deleted-record permissions to ADMIN', async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);
    const queryInterface = {
      sequelize: { query },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryInterface);

    expect(query.mock.calls[0][1].bind).toMatchObject({
      oldName: 'users.restore',
      newName: 'users.deleted.update',
    });
    expect(query.mock.calls[4][1].bind).toMatchObject({
      permissionName0: 'users.deleted.update',
      permissionName1: 'companies.deleted.read',
      permissionName2: 'companies.deleted.update',
    });
    expect(query.mock.calls[4][0]).toContain("roles.name = 'ADMIN'");
    expect(query.mock.calls[5][0]).toContain('authorization_version');
  });

  it('removes company permissions and restores the former user permission on rollback', async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);
    const queryInterface = {
      sequelize: { query },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface);

    expect(query.mock.calls[0][0]).toContain('authorization_version');
    expect(query.mock.calls[1][0]).toContain('DELETE grants');
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith('permissions', {
      name: ['companies.deleted.read', 'companies.deleted.update'],
    });
    expect(query.mock.calls[2][1].bind).toMatchObject({
      oldName: 'users.restore',
      newName: 'users.deleted.update',
    });
  });
});
