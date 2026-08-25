import { jest } from '@jest/globals';

import migration from '../migrations/20260825_zz_add_role_scoped_user_read_permissions.js';

describe('role-scoped user visibility permission migration', () => {
  const Sequelize = { STRING: jest.fn((length) => `STRING(${length})`) };

  beforeEach(() => Sequelize.STRING.mockClear());

  it('uses readable role names, grants each role its permission and grants all access to ADMIN', async () => {
    const query = jest.fn().mockImplementation((sql) =>
      Promise.resolve(
        sql.includes('SELECT id, name FROM roles')
          ? [
              [
                { id: 1, name: 'ADMIN' },
                { id: 2, name: 'TECHNICIEN' },
              ],
              {},
            ]
          : [[], {}],
      ),
    );
    const queryInterface = {
      sequelize: { query },
      changeColumn: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.changeColumn).toHaveBeenCalledWith(
      'permissions',
      'name',
      expect.objectContaining({ type: 'STRING(150)', allowNull: false }),
    );
    const replacements = query.mock.calls.map((call) => call[1]?.replacements).filter(Boolean);
    expect(replacements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'users.all.read' }),
        expect.objectContaining({ name: 'users.roles.ADMIN.read' }),
        expect.objectContaining({ name: 'users.roles.TECHNICIEN.read' }),
        expect.objectContaining({ roleId: 1, permissionName: 'users.roles.ADMIN.read' }),
        expect.objectContaining({ roleId: 2, permissionName: 'users.roles.TECHNICIEN.read' }),
        expect.objectContaining({ permissionName: 'users.all.read' }),
      ]),
    );
    expect(JSON.stringify(replacements)).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.read/i,
    );
    expect(query.mock.calls.at(-1)[0]).toContain('authorization_version');
  });

  it('removes generated permissions before restoring the former column size', async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);
    const queryInterface = {
      sequelize: { query },
      changeColumn: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface, Sequelize);

    expect(query.mock.calls[1][1].replacements).toEqual({
      allUsersPermission: 'users.all.read',
      rolePermissionPattern: 'users.roles.%.read',
    });
    expect(query.mock.calls[2][0]).toContain('DELETE FROM permissions');
    expect(queryInterface.changeColumn).toHaveBeenLastCalledWith(
      'permissions',
      'name',
      expect.objectContaining({ type: 'STRING(100)', allowNull: false }),
    );
  });
});
