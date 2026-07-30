'use strict';

const { randomUUID } = require('node:crypto');

const permissionMappings = [
  {
    source: 'maintenance.read',
    name: 'maintenance.operations.read',
    description: 'Consulter le catalogue des opérations réutilisables de maintenance.',
  },
  {
    source: 'maintenance.create',
    name: 'maintenance.operations.create',
    description: 'Ajouter de nouvelles opérations réutilisables de maintenance.',
  },
  {
    source: 'maintenance.update',
    name: 'maintenance.operations.update',
    description: 'Modifier les opérations réutilisables et leur statut d’activation.',
  },
  {
    source: 'maintenance.delete',
    name: 'maintenance.operations.delete',
    description: 'Supprimer les opérations de maintenance qui ne sont utilisées par aucun plan.',
  },
  {
    source: 'maintenance.read',
    name: 'maintenance.parts.read',
    description: 'Consulter le catalogue des références de pièces utilisées en maintenance.',
  },
  {
    source: 'maintenance.create',
    name: 'maintenance.parts.create',
    description: 'Ajouter de nouvelles références de pièces destinées à la maintenance.',
  },
  {
    source: 'maintenance.update',
    name: 'maintenance.parts.update',
    description: 'Modifier les références de pièces et leur statut d’activation.',
  },
  {
    source: 'maintenance.delete',
    name: 'maintenance.parts.delete',
    description: 'Supprimer les pièces de maintenance qui ne sont utilisées par aucun plan.',
  },
];

const permissionNames = permissionMappings.map(({ name }) => name);

/**
 * Splits operation and part catalogue management from maintenance-plan permissions.
 *
 * Existing role grants are copied to preserve access after deployment. Administrators
 * can then manage every catalogue permission independently from the role workspace.
 */
module.exports = {
  async up(queryInterface) {
    const timestamp = new Date();
    await queryInterface.sequelize.query(
      'UPDATE permissions SET deleted_at = NULL, updated_at = :timestamp WHERE name IN (:names) AND deleted_at IS NOT NULL',
      { replacements: { names: permissionNames, timestamp } },
    );

    const [rows] = await queryInterface.sequelize.query(
      'SELECT name FROM permissions WHERE name IN (:names) AND deleted_at IS NULL',
      { replacements: { names: permissionNames } },
    );
    const existingNames = new Set(rows.map(({ name }) => name));
    const missingPermissions = permissionMappings
      .filter(({ name }) => !existingNames.has(name))
      .map(({ name, description }) => ({
        uuid: randomUUID(),
        name,
        description,
        created_at: timestamp,
        updated_at: timestamp,
      }));

    if (missingPermissions.length) {
      await queryInterface.bulkInsert('permissions', missingPermissions);
    }

    for (const { source, name } of permissionMappings) {
      await queryInterface.sequelize.query(
        `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
         SELECT :timestamp, :timestamp, grants.role_id, targetPermission.id
         FROM role_permissions AS grants
         INNER JOIN permissions AS sourcePermission
           ON sourcePermission.id = grants.permission_id
         INNER JOIN permissions AS targetPermission
           ON targetPermission.name = :targetName
         WHERE sourcePermission.name = :sourceName
           AND sourcePermission.deleted_at IS NULL
           AND targetPermission.deleted_at IS NULL`,
        { replacements: { sourceName: source, targetName: name, timestamp } },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE grants
       FROM role_permissions AS grants
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       WHERE permissions.name IN (:names)`,
      { replacements: { names: permissionNames } },
    );
    await queryInterface.bulkDelete('permissions', { name: permissionNames });
  },
};
