'use strict';

const { randomUUID } = require('node:crypto');

const sourcePermission = 'maintenance.parts.update';
const permissions = [
  {
    name: 'maintenance.parts.stock.adjust_on_hand',
    description: 'Corriger directement la quantité réellement disponible dans le stock atelier.',
  },
  {
    name: 'maintenance.parts.stock.adjust_on_order',
    description: 'Corriger directement la quantité actuellement enregistrée comme commandée.',
  },
  {
    name: 'maintenance.parts.stock.order',
    description: 'Enregistrer une nouvelle commande de pièces destinées à la maintenance.',
  },
  {
    name: 'maintenance.parts.stock.receive',
    description: 'Réceptionner des pièces commandées et les transférer dans le stock atelier.',
  },
  {
    name: 'maintenance.parts.price.update',
    description: 'Modifier le prix unitaire courant d’une pièce de maintenance.',
  },
];
const permissionNames = permissions.map(({ name }) => name);

/** Adds granular part actions while preserving every existing part-update role grant. */
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
    const missingPermissions = permissions
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

    for (const { name } of permissions) {
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
        {
          replacements: {
            sourceName: sourcePermission,
            targetName: name,
            timestamp,
          },
        },
      );
    }

    await queryInterface.sequelize.query(
      `UPDATE users AS users
       INNER JOIN user_roles AS userRoles ON userRoles.user_id = users.id
       INNER JOIN role_permissions AS grants ON grants.role_id = userRoles.role_id
       INNER JOIN permissions AS sourcePermission ON sourcePermission.id = grants.permission_id
       SET users.authorization_version = users.authorization_version + 1
       WHERE sourcePermission.name = :sourceName
         AND sourcePermission.deleted_at IS NULL`,
      { replacements: { sourceName: sourcePermission } },
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users AS users
       INNER JOIN user_roles AS userRoles ON userRoles.user_id = users.id
       INNER JOIN role_permissions AS grants ON grants.role_id = userRoles.role_id
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       SET users.authorization_version = users.authorization_version + 1
       WHERE permissions.name IN (:names)`,
      { replacements: { names: permissionNames } },
    );
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
