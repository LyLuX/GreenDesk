'use strict';

const { randomUUID } = require('node:crypto');
const permission = {
  name: 'users.company.create',
  description: 'Créer des comptes USER uniquement dans ses sociétés de rattachement.',
};

/** Adds scoped account creation without granting global identity-administration rights. */
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
         FROM roles INNER JOIN permissions ON permissions.name = $permissionName
         WHERE roles.name = 'MANAGER' AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL`,
        { bind: { permissionName: permission.name, timestamp }, transaction },
      );
      await queryInterface.sequelize.query(
        `UPDATE users AS u INNER JOIN user_roles AS ur ON ur.user_id = u.id
         INNER JOIN roles AS r ON r.id = ur.role_id
         SET u.authorization_version = u.authorization_version + 1 WHERE r.name = 'MANAGER'`,
        { transaction },
      );
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE users AS u INNER JOIN user_roles AS ur ON ur.user_id = u.id
         INNER JOIN role_permissions AS rp ON rp.role_id = ur.role_id
         INNER JOIN permissions AS p ON p.id = rp.permission_id
         SET u.authorization_version = u.authorization_version + 1 WHERE p.name = $permissionName`,
        { bind: { permissionName: permission.name }, transaction },
      );
      await queryInterface.sequelize.query(
        `DELETE rp FROM role_permissions AS rp INNER JOIN permissions AS p ON p.id = rp.permission_id
         WHERE p.name = $permissionName`,
        { bind: { permissionName: permission.name }, transaction },
      );
      await queryInterface.bulkDelete('permissions', { name: permission.name }, { transaction });
    });
  },
};
