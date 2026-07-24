'use strict';

const { randomUUID } = require('node:crypto');

const permissionMappings = [
  { from: 'brand.read', to: 'brands.read', description: 'Read brands' },
  { from: 'brand.create', to: 'brands.create', description: 'Create brands' },
  { from: 'brand.update', to: 'brands.update', description: 'Update brands' },
  { from: 'brand.delete', to: 'brands.delete', description: 'Delete brands' },
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
       SELECT :timestamp, :timestamp, rolePermissions.role_id, currentPermission.id
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS legacyPermission ON legacyPermission.id = rolePermissions.permission_id
       INNER JOIN permissions AS currentPermission
         ON currentPermission.name = CONCAT('brands.', SUBSTRING_INDEX(legacyPermission.name, '.', -1))
       WHERE legacyPermission.name IN (:names)
         AND legacyPermission.deleted_at IS NULL
         AND currentPermission.deleted_at IS NULL`,
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
       SELECT :timestamp, :timestamp, rolePermissions.role_id, legacyPermission.id
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS currentPermission ON currentPermission.id = rolePermissions.permission_id
       INNER JOIN permissions AS legacyPermission
         ON legacyPermission.name = CONCAT('brand.', SUBSTRING_INDEX(currentPermission.name, '.', -1))
       WHERE currentPermission.name IN (:names)
         AND currentPermission.deleted_at IS NULL`,
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
