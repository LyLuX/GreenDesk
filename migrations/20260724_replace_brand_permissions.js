'use strict';

const { randomUUID } = require('node:crypto');

const permissionMappings = [
  {
    from: 'brand.read',
    to: 'brands.read',
    description: 'Consulter la liste et le détail des marques.',
  },
  {
    from: 'brand.create',
    to: 'brands.create',
    description: 'Ajouter de nouvelles marques au référentiel.',
  },
  {
    from: 'brand.update',
    to: 'brands.update',
    description: 'Modifier les informations des marques.',
  },
  {
    from: 'brand.delete',
    to: 'brands.delete',
    description: 'Supprimer des marques du référentiel.',
  },
];

const names = (key) => permissionMappings.map((permission) => permission[key]);

/**
 * Normalizes brand permissions to the plural namespace used by other modules.
 *
 * Existing role grants are copied before the legacy permission rows are removed.
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
       SELECT $timestamp, $timestamp, rolePermissions.role_id, currentPermission.id
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS legacyPermission ON legacyPermission.id = rolePermissions.permission_id
       INNER JOIN permissions AS currentPermission
         ON currentPermission.name = CONCAT('brands.', SUBSTRING_INDEX(legacyPermission.name, '.', -1))
       WHERE legacyPermission.name IN (${sourceNamePlaceholders})
         AND legacyPermission.deleted_at IS NULL
         AND currentPermission.deleted_at IS NULL`,
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
       SELECT $timestamp, $timestamp, rolePermissions.role_id, legacyPermission.id
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS currentPermission ON currentPermission.id = rolePermissions.permission_id
       INNER JOIN permissions AS legacyPermission
         ON legacyPermission.name = CONCAT('brand.', SUBSTRING_INDEX(currentPermission.name, '.', -1))
       WHERE currentPermission.name IN (${targetNamePlaceholders})
         AND currentPermission.deleted_at IS NULL`,
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
