'use strict';

const table = 'users';
const indexName = 'idx_users_deleted_last_login';

/** Supports deterministic last-login ordering across active and soft-deleted user lists. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex(table, ['deleted_at', 'last_login_at', 'id'], {
      name: indexName,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(table, indexName);
  },
};
