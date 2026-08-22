'use strict';

const { randomUUID } = require('node:crypto');

const permissions = [
  {
    name: 'history.fleet.read',
    description: 'Consulter l’historique consolidé de la gestion du parc.',
    sourcePermission: 'materials.read',
  },
  {
    name: 'history.maintenance.read',
    description: 'Consulter l’historique consolidé de la maintenance et des stocks de pièces.',
    sourcePermission: 'maintenance.read',
  },
  {
    name: 'history.administration.read',
    description: 'Consulter l’historique consolidé des actions d’administration.',
    sourceRole: 'ADMIN',
  },
];
const permissionNames = permissions.map(({ name }) => name);
const indexes = [
  ['audit_logs', ['entity', 'created_at'], 'idx_audit_logs_entity_created'],
  ['maintenance_history', ['performed_at', 'created_at'], 'idx_maintenance_history_performed'],
  [
    'maintenance_interventions',
    ['performed_at', 'created_at'],
    'idx_maintenance_interventions_performed',
  ],
  [
    'inventory_stock_movements',
    ['stockable_type', 'performed_at', 'created_at'],
    'idx_inventory_stock_movements_type_performed',
  ],
  [
    'maintenance_part_price_history',
    ['performed_at', 'created_at'],
    'idx_maintenance_part_price_history_performed',
  ],
];

const hasIndex = async (queryInterface, table, name) =>
  (await queryInterface.showIndex(table)).some((index) => index.name === name);

/** Adds independently assignable history access and indexes the consolidated read paths. */
module.exports = {
  async up(queryInterface) {
    const timestamp = new Date();
    await queryInterface.sequelize.query(
      'UPDATE permissions SET deleted_at = NULL, updated_at = :timestamp WHERE name IN (:names) AND deleted_at IS NOT NULL',
      { replacements: { names: permissionNames, timestamp } },
    );
    const [existingRows] = await queryInterface.sequelize.query(
      'SELECT name FROM permissions WHERE name IN (:names) AND deleted_at IS NULL',
      { replacements: { names: permissionNames } },
    );
    const existingNames = new Set(existingRows.map(({ name }) => name));
    const missingPermissions = permissions
      .filter(({ name }) => !existingNames.has(name))
      .map(({ name, description }) => ({
        uuid: randomUUID(),
        name,
        description,
        created_at: timestamp,
        updated_at: timestamp,
      }));
    if (missingPermissions.length)
      await queryInterface.bulkInsert('permissions', missingPermissions);

    for (const permission of permissions) {
      if (permission.sourcePermission) {
        await queryInterface.sequelize.query(
          `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
           SELECT :timestamp, :timestamp, grants.role_id, target.id
           FROM role_permissions AS grants
           INNER JOIN permissions AS source ON source.id = grants.permission_id
           INNER JOIN permissions AS target ON target.name = :targetName
           WHERE source.name = :sourceName AND source.deleted_at IS NULL AND target.deleted_at IS NULL`,
          {
            replacements: {
              timestamp,
              sourceName: permission.sourcePermission,
              targetName: permission.name,
            },
          },
        );
      } else {
        await queryInterface.sequelize.query(
          `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
           SELECT :timestamp, :timestamp, roles.id, permissions.id
           FROM roles
           INNER JOIN permissions ON permissions.name = :permissionName
           WHERE roles.name = :roleName AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL`,
          {
            replacements: {
              timestamp,
              permissionName: permission.name,
              roleName: permission.sourceRole,
            },
          },
        );
      }
    }

    await queryInterface.sequelize.query(
      `UPDATE users AS users
       INNER JOIN user_roles AS userRoles ON userRoles.user_id = users.id
       INNER JOIN role_permissions AS grants ON grants.role_id = userRoles.role_id
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       SET users.authorization_version = users.authorization_version + 1
       WHERE permissions.name IN (:names) AND permissions.deleted_at IS NULL`,
      { replacements: { names: permissionNames } },
    );

    for (const [table, fields, name] of indexes) {
      if (!(await hasIndex(queryInterface, table, name))) {
        await queryInterface.addIndex(table, fields, { name });
      }
    }
  },

  async down(queryInterface) {
    for (const [table, , name] of [...indexes].reverse()) {
      if (await hasIndex(queryInterface, table, name))
        await queryInterface.removeIndex(table, name);
    }
    await queryInterface.sequelize.query(
      `DELETE grants FROM role_permissions AS grants
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       WHERE permissions.name IN (:names)`,
      { replacements: { names: permissionNames } },
    );
    await queryInterface.bulkDelete('permissions', { name: permissionNames });
  },
};
