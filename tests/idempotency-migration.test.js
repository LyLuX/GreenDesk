import { jest } from '@jest/globals';

import migration from '../migrations/20260903_add_api_idempotency_keys.js';

describe('API idempotency migration', () => {
  const sizedType = (name) => Object.assign((length) => `${name}(${length})`, { UNSIGNED: name });
  const Sequelize = {
    BIGINT: { UNSIGNED: 'BIGINT UNSIGNED' },
    SMALLINT: { UNSIGNED: 'SMALLINT UNSIGNED' },
    STRING: sizedType('STRING'),
    CHAR: Object.assign((length) => ({ BINARY: `CHAR(${length}) BINARY` }), {}),
    JSON: 'JSON',
    DATE: 'DATE',
  };

  it('creates a company-and-user-scoped unique key store', async () => {
    const queryInterface = {
      showAllTables: jest.fn().mockResolvedValue([]),
      describeTable: jest.fn().mockResolvedValue({}),
      createTable: jest.fn(),
      showIndex: jest.fn().mockResolvedValue([]),
      addIndex: jest.fn(),
      removeColumn: jest.fn(),
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.createTable).toHaveBeenCalledWith(
      'api_idempotency_keys',
      expect.objectContaining({
        company_id: expect.objectContaining({ allowNull: false }),
        user_id: expect.objectContaining({ allowNull: false }),
        operation: expect.objectContaining({ allowNull: false }),
        key_hash: expect.objectContaining({ allowNull: false }),
        request_hash: expect.objectContaining({ allowNull: false }),
        response_body: expect.objectContaining({ type: 'JSON' }),
      }),
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      'api_idempotency_keys',
      ['company_id', 'user_id', 'key_hash'],
      { name: 'uq_api_idempotency_company_user_key_hash', unique: true },
    );
    expect(queryInterface.removeColumn).not.toHaveBeenCalled();
  });

  it('repairs a development table already synchronized by the running application', async () => {
    const queryInterface = {
      showAllTables: jest.fn().mockResolvedValue(['api_idempotency_keys']),
      describeTable: jest.fn().mockResolvedValue({ deleted_at: {} }),
      createTable: jest.fn(),
      showIndex: jest
        .fn()
        .mockResolvedValue([{ name: 'uq_api_idempotency_company_user_key_hash' }]),
      addIndex: jest.fn(),
      removeColumn: jest.fn(),
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.createTable).not.toHaveBeenCalled();
    expect(queryInterface.addIndex).not.toHaveBeenCalled();
    expect(queryInterface.removeColumn).toHaveBeenCalledWith(
      'api_idempotency_keys',
      'deleted_at',
    );
  });

  it('drops the idempotency store on rollback', async () => {
    const queryInterface = { dropTable: jest.fn() };

    await migration.down(queryInterface);

    expect(queryInterface.dropTable).toHaveBeenCalledWith('api_idempotency_keys');
  });
});
