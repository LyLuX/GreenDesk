'use strict';

const { randomUUID } = require('node:crypto');
const permission = {
  name: 'maintenance.parts.history.date.update',
  description:
    'Corriger les dates des mouvements de stock, interventions ponctuelles et changements de prix des pièces de maintenance.',
};

/** Adds a critical date-correction permission, granted only to existing administrators. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const timestamp = new Date();
      await queryInterface.sequelize.query(
        `INSERT INTO permissions (uuid, name, description, created_at, updated_at)
         VALUES ($uuid, $name, $description, $timestamp, $timestamp)
         ON DUPLICATE KEY UPDATE description = $description, deleted_at = NULL, updated_at = $timestamp`,
        { bind: { uuid: randomUUID(), ...permission, timestamp }, transaction },
      );
      await queryInterface.sequelize.query(
        `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
         SELECT $timestamp, $timestamp, roles.id, permissions.id
         FROM roles INNER JOIN permissions ON permissions.name = $name
         WHERE roles.name = 'ADMIN' AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL`,
        { bind: { name: permission.name, timestamp }, transaction },
      );
      await queryInterface.sequelize.query(
        `UPDATE users AS users
         INNER JOIN user_roles AS userRoles ON userRoles.user_id = users.id
         INNER JOIN role_permissions AS grants ON grants.role_id = userRoles.role_id
         INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
         SET users.authorization_version = users.authorization_version + 1
         WHERE permissions.name = $name`,
        { bind: { name: permission.name }, transaction },
      );
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE users AS users
         INNER JOIN user_roles AS userRoles ON userRoles.user_id = users.id
         INNER JOIN role_permissions AS grants ON grants.role_id = userRoles.role_id
         INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
         SET users.authorization_version = users.authorization_version + 1
         WHERE permissions.name = $name`,
        { bind: { name: permission.name }, transaction },
      );
      await queryInterface.sequelize.query(
        `DELETE grants FROM role_permissions AS grants
         INNER JOIN permissions ON permissions.id = grants.permission_id
         WHERE permissions.name = $name`,
        { bind: { name: permission.name }, transaction },
      );
      await queryInterface.bulkDelete('permissions', { name: permission.name }, { transaction });
    });
  },
};
