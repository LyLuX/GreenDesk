'use strict';

/** Stores revoked JWT identifiers until their original expiration date. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();
    if (existingTables.includes('revoked_access_tokens')) return;

    await queryInterface.createTable(
      'revoked_access_tokens',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        token_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      },
      {
        charset: 'utf8mb4',
      },
    );
  },

  async down(queryInterface) {
    const existingTables = await queryInterface.showAllTables();
    if (!existingTables.includes('revoked_access_tokens')) return;

    await queryInterface.dropTable('revoked_access_tokens');
  },
};
