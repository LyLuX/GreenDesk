'use strict';

const { randomUUID } = require('node:crypto');

const permission = {
  name: 'maintenance.execute_without_part_replacement',
  description: 'Enregistrer exceptionnellement un entretien sans remplacer les pièces prévues.',
};

/** Adds the exceptional maintenance execution permission without granting it to existing roles. */
module.exports = {
  async up(queryInterface) {
    const timestamp = new Date();
    await queryInterface.sequelize.query(
      'UPDATE permissions SET deleted_at = NULL, description = $description, updated_at = $timestamp WHERE name = $name AND deleted_at IS NOT NULL',
      { bind: { ...permission, timestamp } },
    );

    const [rows] = await queryInterface.sequelize.query(
      'SELECT name FROM permissions WHERE name = $name AND deleted_at IS NULL',
      { bind: { name: permission.name } },
    );
    if (!rows.length) {
      await queryInterface.bulkInsert('permissions', [
        {
          uuid: randomUUID(),
          ...permission,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE grants
       FROM role_permissions AS grants
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       WHERE permissions.name = $name`,
      { bind: { name: permission.name } },
    );
    await queryInterface.bulkDelete('permissions', { name: permission.name });
  },
};
