'use strict';

const { randomUUID } = require('node:crypto');

const permission = {
  name: 'dashboard.read.financial',
  description: 'Consulter les indicateurs financiers du tableau de bord.',
};

/** Adds independently assignable access to sensitive dashboard financial indicators. */
module.exports = {
  async up(queryInterface) {
    const timestamp = new Date();
    await queryInterface.sequelize.query(
      'UPDATE permissions SET deleted_at = NULL, description = :description, updated_at = :timestamp WHERE name = :name AND deleted_at IS NOT NULL',
      { replacements: { ...permission, timestamp } },
    );
    const [rows] = await queryInterface.sequelize.query(
      'SELECT name FROM permissions WHERE name = :name AND deleted_at IS NULL',
      { replacements: { name: permission.name } },
    );
    if (!rows.length) {
      await queryInterface.bulkInsert('permissions', [
        {
          uuid: randomUUID(),
          ...permission,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users AS users
       INNER JOIN user_roles AS userRoles ON userRoles.user_id = users.id
       INNER JOIN role_permissions AS grants ON grants.role_id = userRoles.role_id
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       SET users.authorization_version = users.authorization_version + 1
       WHERE permissions.name = :name`,
      { replacements: { name: permission.name } },
    );
    await queryInterface.sequelize.query(
      `DELETE grants FROM role_permissions AS grants
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       WHERE permissions.name = :name`,
      { replacements: { name: permission.name } },
    );
    await queryInterface.bulkDelete('permissions', { name: permission.name });
  },
};
