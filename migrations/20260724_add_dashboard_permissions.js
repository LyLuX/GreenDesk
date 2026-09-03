'use strict';

const { randomUUID } = require('node:crypto');

const dashboardPermissions = [
  {
    name: 'dashboard.read',
    description: 'Consulter les indicateurs du tableau de bord.',
  },
];
const dashboardPermissionNames = dashboardPermissions.map(({ name }) => name);
const dashboardPermissionBinds = Object.fromEntries(
  dashboardPermissionNames.map((value, index) => [`dashboardPermission${index}`, value]),
);
const dashboardPermissionPlaceholders = Object.keys(dashboardPermissionBinds)
  .map((key) => `$${key}`)
  .join(', ');

/**
 * Adds the permissions required by the current read-only dashboard.
 *
 * The development seeder already contains these permissions, but this migration
 * also brings databases created before the dashboard module up to date.
 */
module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT name FROM permissions WHERE name IN (${dashboardPermissionPlaceholders}) AND deleted_at IS NULL`,
      { bind: dashboardPermissionBinds },
    );
    const existingNames = new Set(rows.map(({ name }) => name));
    const timestamp = new Date();
    const missingPermissions = dashboardPermissions
      .filter(({ name }) => !existingNames.has(name))
      .map((permission) => ({
        uuid: randomUUID(),
        ...permission,
        created_at: timestamp,
        updated_at: timestamp,
      }));

    if (missingPermissions.length)
      await queryInterface.bulkInsert('permissions', missingPermissions);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permissions', {
      name: dashboardPermissionNames,
    });
  },
};
