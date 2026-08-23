import { jest } from '@jest/globals';

import migration from '../migrations/20260823_add_granular_action_permissions.js';

const legacyPermissions = [
  'USER_READ',
  'USER_CREATE',
  'USER_UPDATE',
  'USER_DELETE',
  'categories.update',
  'materials.update',
  'manufacturers.create',
  'manufacturers.update',
  'suppliers.update',
  'maintenance.update',
  'maintenance.operations.update',
  'maintenance.parts.update',
];

const createQueryInterface = () => {
  let nextId = 100;
  const records = new Map(legacyPermissions.map((name, index) => [name, { id: index + 1, name }]));
  const query = jest.fn(async (sql, options = {}) => {
    const replacements = options.replacements ?? {};
    if (sql.startsWith('SELECT id, name FROM permissions')) {
      const record = records.get(replacements.name);
      return [record ? [record] : [], {}];
    }
    if (sql.startsWith('UPDATE permissions SET name')) {
      const record = [...records.values()].find(({ id }) => id === replacements.id);
      records.delete(record.name);
      record.name = replacements.to;
      records.set(record.name, record);
    }
    return [[], {}];
  });
  const queryInterface = {
    sequelize: { query },
    bulkInsert: jest.fn(async (_table, rows) => {
      for (const row of rows) records.set(row.name, { id: nextId++, name: row.name });
    }),
    bulkDelete: jest.fn().mockResolvedValue(undefined),
  };
  return { queryInterface, query, records };
};

describe('granular action permissions migration', () => {
  it('renames legacy user permissions and copies historical grants', async () => {
    const { queryInterface, query, records } = createQueryInterface();

    await migration.up(queryInterface);

    expect(records.has('USER_READ')).toBe(false);
    expect(records.has('users.read')).toBe(true);
    expect(records.has('users.status.update')).toBe(true);
    expect(records.has('materials.photos.set_primary')).toBe(true);
    expect(records.has('manufacturers.logo.upload')).toBe(true);
    const grantQueries = query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT IGNORE INTO role_permissions'),
    );
    expect(grantQueries.length).toBeGreaterThan(20);
    expect(query.mock.calls.at(-1)[0]).toContain('authorization_version');
  });

  it('removes granular permissions and restores legacy user names on rollback', async () => {
    const queryInterface = {
      sequelize: { query: jest.fn().mockResolvedValue([[], {}]) },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface);

    expect(queryInterface.sequelize.query.mock.calls[0][0]).toContain('authorization_version');
    expect(queryInterface.sequelize.query.mock.calls[1][0]).toContain('DELETE grants');
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith(
      'permissions',
      expect.objectContaining({ name: expect.arrayContaining(['users.status.update']) }),
    );
    expect(
      queryInterface.sequelize.query.mock.calls.some(
        ([sql, options]) =>
          sql.startsWith('UPDATE permissions SET name') &&
          options.replacements.legacyName === 'USER_READ',
      ),
    ).toBe(true);
  });
});
