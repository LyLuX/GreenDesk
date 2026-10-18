import { jest } from '@jest/globals';
import migration from '../migrations/20261017_add_company_user_creation_permission.js';

const setup = () => {
  const transaction = { id: 'migration' };
  const query = jest.fn().mockResolvedValue([[], {}]);
  return {
    transaction,
    query,
    queryInterface: {
      sequelize: { query, transaction: jest.fn((callback) => callback(transaction)) },
      bulkDelete: jest.fn(),
    },
  };
};

describe('company user creation permission migration', () => {
  it('adds the specific permission and grants only MANAGER while refreshing its sessions', async () => {
    const { queryInterface, query, transaction } = setup();
    await migration.up(queryInterface);
    expect(query.mock.calls[0][1]).toMatchObject({
      bind: { name: 'users.company.create' },
      transaction,
    });
    expect(query.mock.calls[1][0]).toContain("roles.name = 'MANAGER'");
    expect(query.mock.calls[1][0]).not.toContain("roles.name = 'USER'");
    expect(query.mock.calls[2][0]).toContain('authorization_version + 1');
    expect(query.mock.calls.every(([, options]) => options.transaction === transaction)).toBe(true);
  });
  it('invalidates affected sessions before removing the grant and permission on rollback', async () => {
    const { queryInterface, query, transaction } = setup();
    await migration.down(queryInterface);
    expect(query.mock.calls[0][0]).toContain('authorization_version + 1');
    expect(query.mock.calls[1][0]).toContain('DELETE rp');
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith(
      'permissions',
      { name: 'users.company.create' },
      { transaction },
    );
  });
});
