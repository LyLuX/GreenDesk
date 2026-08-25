'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO user_companies (user_id, company_id, created_at, updated_at)
       SELECT users.id, companies.id, NOW(), NOW()
       FROM users
       INNER JOIN companies ON companies.code = 'EI_BOURNAZEL_PAUL'
       WHERE NOT EXISTS (
         SELECT 1
         FROM user_roles
         INNER JOIN roles ON roles.id = user_roles.role_id
         WHERE user_roles.user_id = users.id
           AND roles.name = 'ADMIN'
           AND roles.deleted_at IS NULL
       )
         AND NOT EXISTS (
           SELECT 1 FROM user_companies WHERE user_companies.user_id = users.id
         )`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE memberships
       FROM user_companies AS memberships
       INNER JOIN users ON users.id = memberships.user_id
       INNER JOIN companies ON companies.id = memberships.company_id
       WHERE users.deleted_at IS NOT NULL
         AND companies.code = 'EI_BOURNAZEL_PAUL'`,
    );
  },
};
