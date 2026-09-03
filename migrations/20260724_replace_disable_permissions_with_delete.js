'use strict';

const { randomUUID } = require('node:crypto');

const permissionMappings = [
  {
    from: 'categories.disable',
    to: 'categories.delete',
    description: 'Supprimer des catégories du référentiel.',
  },
  {
    from: 'materials.disable',
    to: 'materials.delete',
    description: 'Retirer des matériels du parc.',
  },
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
    const targetNames = names('to');
    const targetNameBinds = Object.fromEntries(
      targetNames.map((value, index) => [`targetName${index}`, value]),
    );
    const targetNamePlaceholders = Object.keys(targetNameBinds)
      .map((key) => `$${key}`)
      .join(', ');
    const sourceNames = names('from');
    const sourceNameBinds = Object.fromEntries(
      sourceNames.map((value, index) => [`sourceName${index}`, value]),
    );
    const sourceNamePlaceholders = Object.keys(sourceNameBinds)
      .map((key) => `$${key}`)
      .join(', ');
    await queryInterface.sequelize.query(
      `UPDATE permissions SET deleted_at = NULL, updated_at = $timestamp WHERE name IN (${targetNamePlaceholders}) AND deleted_at IS NOT NULL`,
      { bind: { ...targetNameBinds, timestamp } },
    );
    const [rows] = await queryInterface.sequelize.query(
      `SELECT name FROM permissions WHERE name IN (${targetNamePlaceholders}) AND deleted_at IS NULL`,
      { bind: targetNameBinds },
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
       SELECT $timestamp, $timestamp, rolePermissions.role_id, deletePermission.id
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS disablePermission ON disablePermission.id = rolePermissions.permission_id
       INNER JOIN permissions AS deletePermission
         ON deletePermission.name = CONCAT(SUBSTRING_INDEX(disablePermission.name, '.', 1), '.delete')
       WHERE disablePermission.name IN (${sourceNamePlaceholders})
         AND disablePermission.deleted_at IS NULL
         AND deletePermission.deleted_at IS NULL`,
      { bind: { ...sourceNameBinds, timestamp } },
    );
    await queryInterface.sequelize.query(
      `DELETE rolePermissions
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS permissions ON permissions.id = rolePermissions.permission_id
       WHERE permissions.name IN (${sourceNamePlaceholders})`,
      { bind: sourceNameBinds },
    );
    await queryInterface.bulkDelete('permissions', { name: names('from') });
  },

  async down(queryInterface) {
    const timestamp = new Date();
    const sourceNames = names('from');
    const sourceNameBinds = Object.fromEntries(
      sourceNames.map((value, index) => [`sourceName${index}`, value]),
    );
    const sourceNamePlaceholders = Object.keys(sourceNameBinds)
      .map((key) => `$${key}`)
      .join(', ');
    const targetNames = names('to');
    const targetNameBinds = Object.fromEntries(
      targetNames.map((value, index) => [`targetName${index}`, value]),
    );
    const targetNamePlaceholders = Object.keys(targetNameBinds)
      .map((key) => `$${key}`)
      .join(', ');
    const [rows] = await queryInterface.sequelize.query(
      `SELECT name FROM permissions WHERE name IN (${sourceNamePlaceholders})`,
      { bind: sourceNameBinds },
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
       SELECT $timestamp, $timestamp, rolePermissions.role_id, disablePermission.id
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS deletePermission ON deletePermission.id = rolePermissions.permission_id
       INNER JOIN permissions AS disablePermission
         ON disablePermission.name = CONCAT(SUBSTRING_INDEX(deletePermission.name, '.', 1), '.disable')
       WHERE deletePermission.name IN (${targetNamePlaceholders})
         AND deletePermission.deleted_at IS NULL`,
      { bind: { ...targetNameBinds, timestamp } },
    );
    await queryInterface.sequelize.query(
      `DELETE rolePermissions
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS permissions ON permissions.id = rolePermissions.permission_id
       WHERE permissions.name IN (${targetNamePlaceholders})`,
      { bind: targetNameBinds },
    );
    await queryInterface.bulkDelete('permissions', { name: names('to') });
  },
};
