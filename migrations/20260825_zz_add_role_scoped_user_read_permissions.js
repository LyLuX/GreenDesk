'use strict';

const { randomUUID } = require('node:crypto');

const ALL_USERS_READ_PERMISSION = {
  name: 'users.all.read',
  description: 'Consulter tous les utilisateurs, indépendamment de leur rôle.',
};
const ROLE_PERMISSION_PREFIX = 'users.roles.';
const ROLE_PERMISSION_SUFFIX = '.read';
const rolePermissionName = (roleName) =>
  `${ROLE_PERMISSION_PREFIX}${roleName}${ROLE_PERMISSION_SUFFIX}`;
const rolePermissionDescription = (roleName) =>
  `Consulter les utilisateurs rattachés au rôle « ${roleName} ».`;

const ensurePermission = async (queryInterface, permission, timestamp) => {
  await queryInterface.sequelize.query(
    `INSERT INTO permissions (uuid, name, description, created_at, updated_at)
     VALUES ($uuid, $name, $description, $timestamp, $timestamp)
     ON DUPLICATE KEY UPDATE description = $description, deleted_at = NULL, updated_at = $timestamp`,
    { bind: { uuid: randomUUID(), ...permission, timestamp } },
  );
};

/** Adds permission-driven user visibility scopes for every existing and future role. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();
    await queryInterface.changeColumn('permissions', 'name', {
      type: Sequelize.STRING(150),
      allowNull: false,
    });
    await ensurePermission(queryInterface, ALL_USERS_READ_PERMISSION, timestamp);
    const [roles] = await queryInterface.sequelize.query(
      'SELECT id, name FROM roles WHERE deleted_at IS NULL',
    );
    for (const role of roles) {
      const permission = {
        name: rolePermissionName(role.name),
        description: rolePermissionDescription(role.name),
      };
      await ensurePermission(queryInterface, permission, timestamp);
      await queryInterface.sequelize.query(
        `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
         SELECT $timestamp, $timestamp, $roleId, permissions.id
         FROM permissions
         WHERE permissions.name = $permissionName AND permissions.deleted_at IS NULL`,
        {
          bind: {
            timestamp,
            roleId: role.id,
            permissionName: permission.name,
          },
        },
      );
    }
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
       SELECT $timestamp, $timestamp, roles.id, permissions.id
       FROM roles
       INNER JOIN permissions ON permissions.name = $permissionName
       WHERE roles.name = 'ADMIN' AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL`,
      {
        bind: {
          timestamp,
          permissionName: ALL_USERS_READ_PERMISSION.name,
        },
      },
    );
    await queryInterface.sequelize.query(
      'UPDATE users SET authorization_version = authorization_version + 1',
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'UPDATE users SET authorization_version = authorization_version + 1',
    );
    await queryInterface.sequelize.query(
      `DELETE grants FROM role_permissions AS grants
       INNER JOIN permissions ON permissions.id = grants.permission_id
       WHERE permissions.name = $allUsersPermission OR permissions.name LIKE $rolePermissionPattern`,
      {
        bind: {
          allUsersPermission: ALL_USERS_READ_PERMISSION.name,
          rolePermissionPattern: `${ROLE_PERMISSION_PREFIX}%${ROLE_PERMISSION_SUFFIX}`,
        },
      },
    );
    await queryInterface.sequelize.query(
      'DELETE FROM permissions WHERE name = $allUsersPermission OR name LIKE $rolePermissionPattern',
      {
        bind: {
          allUsersPermission: ALL_USERS_READ_PERMISSION.name,
          rolePermissionPattern: `${ROLE_PERMISSION_PREFIX}%${ROLE_PERMISSION_SUFFIX}`,
        },
      },
    );
    await queryInterface.changeColumn('permissions', 'name', {
      type: Sequelize.STRING(100),
      allowNull: false,
    });
  },
};
