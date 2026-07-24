'use strict';

const { randomUUID } = require('node:crypto');

const dashboardPermissions = [
  {
    name: 'dashboard.read',
    description: 'View the dashboard',
  },
];

/**
 * Adds the permissions required by the current read-only dashboard.
 *
 * The development seeder already contains these permissions, but this migration
 * also brings databases created before the dashboard module up to date.
 */
module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT name FROM permissions WHERE name IN (:names) AND deleted_at IS NULL',
      { replacements: { names: dashboardPermissions.map(({ name }) => name) } },
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
      name: dashboardPermissions.map(({ name }) => name),
    });
  },
};
