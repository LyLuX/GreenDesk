import { describe, expect, it, jest } from '@jest/globals';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const migration = require('../migrations/20260827_zz_add_relations_read_permission.js');

describe('relations.read migration', () => {
  it('creates the permission, grants it to ADMIN and refreshes active sessions', async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);
    const queryInterface = {
      sequelize: { query },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryInterface);

    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO permissions'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => sql.includes('role_permissions'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => sql.includes('authorization_version'))).toBe(true);
    expect(query.mock.calls.every(([, options]) => options?.bind?.name !== '')).toBe(true);
  });

  it('removes the grant and permission on rollback', async () => {
    const queryInterface = {
      sequelize: { query: jest.fn().mockResolvedValue([[], {}]) },
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface);

    expect(queryInterface.bulkDelete).toHaveBeenCalledWith('permissions', {
      name: 'relations.read',
    });
  });
});
