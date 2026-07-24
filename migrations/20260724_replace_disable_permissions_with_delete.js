'use strict';

const { randomUUID } = require('node:crypto');

const permissionMappings = [
  { from: 'categories.disable', to: 'categories.delete', description: 'Delete categories' },
  { from: 'properties.disable', to: 'properties.delete', description: 'Delete properties' },
  { from: 'materials.disable', to: 'materials.delete', description: 'Delete materials' },
];

const names = (key) => permissionMappings.map((permission) => permission[key]);

/**
 * Replaces obsolete status permissions with soft-delete permissions.
 *
 * Existing role assignments are copied before obsolete permissions and their
 * join-table rows are removed, so existing users keep equivalent access.
 */
module.exports = {
  async up(queryInterface) {
    const timestamp = new Date();
    await queryInterface.sequelize.query(
      'UPDATE permissions SET deleted_at = NULL, updated_at = :timestamp WHERE name IN (:names) AND deleted_at IS NOT NULL',
      { replacements: { names: names('to'), timestamp } },
    );
    const [rows] = await queryInterface.sequelize.query(
      'SELECT name FROM permissions WHERE name IN (:names) AND deleted_at IS NULL',
      { replacements: { names: names('to') } },
    );
    const existingNames = new Set(rows.map(({ name }) => name));
    const permissions = permissionMappings
      .filter(({ to }) => !existingNames.has(to))
      .map(({ to, description }) => ({
        uuid: randomUUID(),
        name: to,
        description,
        created_at: timestamp,
        updated_at: timestamp,
      }));
    if (permissions.length) await queryInterface.bulkInsert('permissions', permissions);

    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
       SELECT :timestamp, :timestamp, rolePermissions.role_id, deletePermission.id
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS disablePermission ON disablePermission.id = rolePermissions.permission_id
       INNER JOIN permissions AS deletePermission
         ON deletePermission.name = CONCAT(SUBSTRING_INDEX(disablePermission.name, '.', 1), '.delete')
       WHERE disablePermission.name IN (:names)
         AND disablePermission.deleted_at IS NULL
         AND deletePermission.deleted_at IS NULL`,
      { replacements: { names: names('from'), timestamp } },
    );
    await queryInterface.sequelize.query(
      `DELETE rolePermissions
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS permissions ON permissions.id = rolePermissions.permission_id
       WHERE permissions.name IN (:names)`,
      { replacements: { names: names('from') } },
    );
    await queryInterface.bulkDelete('permissions', { name: names('from') });
  },

  async down(queryInterface) {
    const timestamp = new Date();
    const [rows] = await queryInterface.sequelize.query(
      'SELECT name FROM permissions WHERE name IN (:names)',
      { replacements: { names: names('from') } },
    );
    const existingNames = new Set(rows.map(({ name }) => name));
    const permissions = permissionMappings
      .filter(({ from }) => !existingNames.has(from))
      .map(({ from }) => ({
        uuid: randomUUID(),
        name: from,
        description: `${from} legacy permission`,
        created_at: timestamp,
        updated_at: timestamp,
      }));
    if (permissions.length) await queryInterface.bulkInsert('permissions', permissions);

    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
       SELECT :timestamp, :timestamp, rolePermissions.role_id, disablePermission.id
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS deletePermission ON deletePermission.id = rolePermissions.permission_id
       INNER JOIN permissions AS disablePermission
         ON disablePermission.name = CONCAT(SUBSTRING_INDEX(deletePermission.name, '.', 1), '.disable')
       WHERE deletePermission.name IN (:names)
         AND deletePermission.deleted_at IS NULL`,
      { replacements: { names: names('to'), timestamp } },
    );
    await queryInterface.sequelize.query(
      `DELETE rolePermissions
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS permissions ON permissions.id = rolePermissions.permission_id
       WHERE permissions.name IN (:names)`,
      { replacements: { names: names('to') } },
    );
    await queryInterface.bulkDelete('permissions', { name: names('to') });
  },
};
