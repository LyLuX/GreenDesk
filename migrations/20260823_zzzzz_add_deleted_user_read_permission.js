'use strict';

const { randomUUID } = require('node:crypto');

const permission = {
  name: 'users.deleted.read',
  description: 'Consulter les comptes utilisateur supprimés.',
};

/** Adds explicit access to soft-deleted accounts and grants it to the built-in administrator. */
module.exports = {
  async up(queryInterface) {
    const timestamp = new Date();
    await queryInterface.sequelize.query(
      `INSERT INTO permissions (uuid, name, description, created_at, updated_at)
       VALUES (:uuid, :name, :description, :timestamp, :timestamp)
       ON DUPLICATE KEY UPDATE description = :description, deleted_at = NULL, updated_at = :timestamp`,
      { replacements: { uuid: randomUUID(), ...permission, timestamp } },
    );
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
       SELECT :timestamp, :timestamp, roles.id, permissions.id
       FROM roles
       INNER JOIN permissions ON permissions.name = :permissionName
       WHERE roles.name = 'ADMIN' AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL`,
      { replacements: { permissionName: permission.name, timestamp } },
    );
    await queryInterface.sequelize.query(
      'UPDATE users SET authorization_version = authorization_version + 1',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'UPDATE users SET authorization_version = authorization_version + 1',
    );
    await queryInterface.sequelize.query(
      `DELETE grants FROM role_permissions AS grants
       INNER JOIN permissions ON permissions.id = grants.permission_id
       WHERE permissions.name = :permissionName`,
      { replacements: { permissionName: permission.name } },
    );
    await queryInterface.bulkDelete('permissions', { name: permission.name });
  },
};
