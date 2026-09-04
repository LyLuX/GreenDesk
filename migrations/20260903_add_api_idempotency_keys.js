'use strict';

const tableExists = async (queryInterface, table) =>
  (await queryInterface.showAllTables()).some(
    (entry) => (typeof entry === 'string' ? entry : entry.tableName) === table,
  );

/** Persists completed critical writes so API retries cannot duplicate their side effects. */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'api_idempotency_keys'))) {
      await queryInterface.createTable('api_idempotency_keys', {
        id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        company_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        operation: { type: Sequelize.STRING(80), allowNull: false },
        key_hash: { type: Sequelize.CHAR(64).BINARY, allowNull: false },
        request_hash: { type: Sequelize.CHAR(64).BINARY, allowNull: false },
        response_status: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: true },
        response_body: { type: Sequelize.JSON, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
    }
    const columns = await queryInterface.describeTable('api_idempotency_keys');
    const indexes = await queryInterface.showIndex('api_idempotency_keys');
    if (!indexes.some(({ name }) => name === 'uq_api_idempotency_company_user_key_hash')) {
      await queryInterface.addIndex(
        'api_idempotency_keys',
        ['company_id', 'user_id', 'key_hash'],
        {
          name: 'uq_api_idempotency_company_user_key_hash',
          unique: true,
        },
      );
    }
    if (columns.deleted_at) {
      await queryInterface.removeColumn('api_idempotency_keys', 'deleted_at');
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('api_idempotency_keys');
  },
};
