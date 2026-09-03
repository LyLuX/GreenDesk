'use strict';

const { randomUUID } = require('node:crypto');

const legacyMaterialPermissions = [
  'MATERIAL_READ',
  'MATERIAL_CREATE',
  'MATERIAL_UPDATE',
  'MATERIAL_DELETE',
];
const legacyMaterialPermissionBinds = Object.fromEntries(
  legacyMaterialPermissions.map((value, index) => [`legacyMaterialPermission${index}`, value]),
);
const legacyMaterialPermissionPlaceholders = Object.keys(legacyMaterialPermissionBinds)
  .map((key) => `$${key}`)
  .join(', ');

/**
 * Removes the unused Sprint 2 material permissions.
 *
 * Current routes and clients use the `materials.*` permission namespace. Role
 * links are deleted first to preserve referential integrity.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE rolePermissions
       FROM role_permissions AS rolePermissions
       INNER JOIN permissions AS permissions ON permissions.id = rolePermissions.permission_id
       WHERE permissions.name IN (${legacyMaterialPermissionPlaceholders})`,
      { bind: legacyMaterialPermissionBinds },
    );
    await queryInterface.bulkDelete('permissions', { name: legacyMaterialPermissions });
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT name FROM permissions WHERE name IN (${legacyMaterialPermissionPlaceholders})`,
      { bind: legacyMaterialPermissionBinds },
    );
    const existingNames = new Set(rows.map(({ name }) => name));
    const timestamp = new Date();
    const permissions = legacyMaterialPermissions
      .filter((name) => !existingNames.has(name))
      .map((name) => ({
        uuid: randomUUID(),
        name,
        description: `${name} legacy permission`,
        created_at: timestamp,
        updated_at: timestamp,
      }));

    if (permissions.length) await queryInterface.bulkInsert('permissions', permissions);
  },
};
