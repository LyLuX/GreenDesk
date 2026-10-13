import { jest } from '@jest/globals';
import migration from '../migrations/20261013_zz_add_maintenance_history_date_permission.js';

const fixture = () => {
  const transaction = { id: 'permission-transaction' };
  const queryInterface = {
    sequelize: {
      transaction: jest.fn((callback) => callback(transaction)),
      query: jest.fn().mockResolvedValue([[], {}]),
    },
    bulkDelete: jest.fn(),
  };
  return { queryInterface, transaction };
};

describe('dedicated maintenance date correction permission migration', () => {
  it('creates the permission and grants only administrators inside one transaction', async () => {
    const { queryInterface, transaction } = fixture();
    await migration.up(queryInterface);
    const calls = queryInterface.sequelize.query.mock.calls;
    expect(calls).toHaveLength(3);
    expect(calls[0][1].bind.name).toBe('maintenance.parts.history.date.update');
    expect(calls[0][0]).toContain('ON DUPLICATE KEY UPDATE');
    expect(calls[1][0]).toContain("roles.name = 'ADMIN'");
    expect(calls[2][0]).toContain('authorization_version = users.authorization_version + 1');
    for (const [, options] of calls) expect(options.transaction).toBe(transaction);
  });

  it('revokes grants and invalidates affected sessions when reverted', async () => {
    const { queryInterface, transaction } = fixture();
    await migration.down(queryInterface);
    expect(queryInterface.sequelize.query.mock.calls[0][0]).toContain('authorization_version');
    expect(queryInterface.sequelize.query.mock.calls[1][0]).toContain('DELETE grants');
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith(
      'permissions',
      { name: 'maintenance.parts.history.date.update' },
      { transaction },
    );
  });
});
