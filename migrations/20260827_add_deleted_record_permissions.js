'use strict';

const { randomUUID } = require('node:crypto');

const retiredUserPermission = 'users.restore';
const permissions = [
  {
    name: 'users.deleted.update',
    description: 'Restaurer des comptes utilisateur supprimés.',
  },
  {
    name: 'companies.deleted.read',
    description: 'Consulter les sociétés supprimées.',
  },
  {
    name: 'companies.deleted.update',
    description: 'Restaurer des sociétés supprimées.',
  },
];

const ensurePermission = (queryInterface, permission, timestamp) =>
  queryInterface.sequelize.query(
    `INSERT INTO permissions (uuid, name, description, created_at, updated_at)
     VALUES (:uuid, :name, :description, :timestamp, :timestamp)
     ON DUPLICATE KEY UPDATE description = :description, deleted_at = NULL, updated_at = :timestamp`,
    { replacements: { uuid: randomUUID(), ...permission, timestamp } },
  );

/** Aligns soft-deletion visibility and restoration permissions for users and companies. */
module.exports = {
  async up(queryInterface) {
    const timestamp = new Date();
    const userDeletedUpdate = permissions[0];
    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET name = :newName, description = :description, updated_at = :timestamp
       WHERE name = :oldName`,
      {
        replacements: {
          oldName: retiredUserPermission,
          newName: userDeletedUpdate.name,
          description: userDeletedUpdate.description,
          timestamp,
        },
      },
    );
    for (const permission of permissions) {
      await ensurePermission(queryInterface, permission, timestamp);
    }
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
       SELECT :timestamp, :timestamp, roles.id, permissions.id
       FROM roles
       INNER JOIN permissions ON permissions.name IN (:permissionNames)
       WHERE roles.name = 'ADMIN' AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL`,
      {
        replacements: {
          permissionNames: permissions.map(({ name }) => name),
          timestamp,
        },
      },
    );
    await queryInterface.sequelize.query(
      'UPDATE users SET authorization_version = authorization_version + 1',
    );
  },

  async down(queryInterface) {
    const companyPermissionNames = permissions.slice(1).map(({ name }) => name);
    await queryInterface.sequelize.query(
      'UPDATE users SET authorization_version = authorization_version + 1',
    );
    await queryInterface.sequelize.query(
      `DELETE grants FROM role_permissions AS grants
       INNER JOIN permissions ON permissions.id = grants.permission_id
       WHERE permissions.name IN (:permissionNames)`,
      { replacements: { permissionNames: companyPermissionNames } },
    );
    await queryInterface.bulkDelete('permissions', { name: companyPermissionNames });
    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET name = :oldName, description = :description, updated_at = NOW()
       WHERE name = :newName`,
      {
        replacements: {
          oldName: retiredUserPermission,
          newName: permissions[0].name,
          description: 'Restaurer des comptes utilisateur supprimés.',
        },
      },
    );
  },
};
