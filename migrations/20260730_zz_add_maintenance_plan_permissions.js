'use strict';

const { randomUUID } = require('node:crypto');

const maintenancePlanPermissions = [
  {
    name: 'maintenance.read',
    description: 'Consulter les plans et l’historique de maintenance.',
  },
  {
    name: 'maintenance.create',
    description: 'Créer de nouveaux plans de maintenance.',
  },
  {
    name: 'maintenance.update',
    description: 'Modifier le paramétrage et le statut des plans de maintenance.',
  },
  {
    name: 'maintenance.delete',
    description: 'Supprimer des plans de maintenance.',
  },
  {
    name: 'maintenance.execute',
    description: 'Enregistrer un entretien réalisé et recalculer ses prochaines échéances.',
  },
];

const permissionNames = maintenancePlanPermissions.map(({ name }) => name);
const permissionNameBinds = Object.fromEntries(
  permissionNames.map((value, index) => [`permissionName${index}`, value]),
);
const permissionNamePlaceholders = Object.keys(permissionNameBinds)
  .map((key) => `$${key}`)
  .join(', ');

/**
 * Adds maintenance-plan permissions to databases that were created without
 * running the development seeder.
 */
module.exports = {
  async up(queryInterface) {
    const timestamp = new Date();
    await queryInterface.sequelize.query(
      `UPDATE permissions SET deleted_at = NULL, updated_at = $timestamp WHERE name IN (${permissionNamePlaceholders}) AND deleted_at IS NOT NULL`,
      { bind: { ...permissionNameBinds, timestamp } },
    );

    const [rows] = await queryInterface.sequelize.query(
      `SELECT name FROM permissions WHERE name IN (${permissionNamePlaceholders}) AND deleted_at IS NULL`,
      { bind: permissionNameBinds },
    );
    const existingNames = new Set(rows.map(({ name }) => name));
    const missingPermissions = maintenancePlanPermissions
      .filter(({ name }) => !existingNames.has(name))
      .map((permission) => ({
        uuid: randomUUID(),
        ...permission,
        created_at: timestamp,
        updated_at: timestamp,
      }));

    if (missingPermissions.length) {
      await queryInterface.bulkInsert('permissions', missingPermissions);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE grants
       FROM role_permissions AS grants
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       WHERE permissions.name IN (${permissionNamePlaceholders})`,
      { bind: permissionNameBinds },
    );
    await queryInterface.bulkDelete('permissions', { name: permissionNames });
  },
};
