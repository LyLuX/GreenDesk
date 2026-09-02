'use strict';

const { randomUUID } = require('node:crypto');

const permission = {
  name: 'companies.logo.update',
  description: 'Ajouter, remplacer ou supprimer le logo d’une société.',
};
const sourcePermissionNames = ['companies.create', 'companies.update'];
const logoColumnNames = ['logo_file_name', 'logo_original_name', 'logo_mime_type'];

/** Adds optional company branding and its independently assignable management permission. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();
    const definitions = {
      logo_file_name: { type: Sequelize.STRING(255), allowNull: true },
      logo_original_name: { type: Sequelize.STRING(255), allowNull: true },
      logo_mime_type: { type: Sequelize.STRING(100), allowNull: true },
    };
    for (const [name, definition] of Object.entries(definitions)) {
      await queryInterface.addColumn('companies', name, definition);
    }
    await queryInterface.sequelize.query(
      `INSERT INTO permissions (uuid, name, description, created_at, updated_at)
       VALUES (:uuid, :name, :description, :timestamp, :timestamp)
       ON DUPLICATE KEY UPDATE description = :description, deleted_at = NULL, updated_at = :timestamp`,
      { replacements: { uuid: randomUUID(), ...permission, timestamp } },
    );
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
       SELECT :timestamp, :timestamp, grants.role_id, target.id
       FROM role_permissions AS grants
       INNER JOIN permissions AS source ON source.id = grants.permission_id
       INNER JOIN permissions AS target ON target.name = :targetName
       WHERE source.name IN (:sourceNames)
         AND source.deleted_at IS NULL
         AND target.deleted_at IS NULL`,
      {
        replacements: {
          sourceNames: sourcePermissionNames,
          targetName: permission.name,
          timestamp,
        },
      },
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
    for (const name of logoColumnNames.toReversed()) {
      await queryInterface.removeColumn('companies', name);
    }
  },
};
