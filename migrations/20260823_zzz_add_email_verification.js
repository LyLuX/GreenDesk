'use strict';

/** Adds email ownership state and one-use verification tokens without locking out existing users. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const userColumns = await queryInterface.describeTable('users');
    if (!userColumns.email_verified_at) {
      await queryInterface.addColumn('users', 'email_verified_at', {
        type: Sequelize.DATE,
        allowNull: true,
        after: 'email',
      });
      await queryInterface.sequelize.query(
        'UPDATE users SET email_verified_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE email_verified_at IS NULL',
      );
    }

    const tables = await queryInterface.showAllTables();
    if (!tables.includes('email_verification_tokens')) {
      await queryInterface.createTable('email_verification_tokens', {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        token_hash: { type: Sequelize.CHAR(64), allowNull: false, unique: true },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        used_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex('email_verification_tokens', ['user_id', 'created_at'], {
        name: 'email_verification_tokens_user_created_idx',
      });
      await queryInterface.addIndex('email_verification_tokens', ['expires_at'], {
        name: 'email_verification_tokens_expires_idx',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('email_verification_tokens');
    const userColumns = await queryInterface.describeTable('users');
    if (userColumns.email_verified_at) {
      await queryInterface.removeColumn('users', 'email_verified_at');
    }
  },
};
