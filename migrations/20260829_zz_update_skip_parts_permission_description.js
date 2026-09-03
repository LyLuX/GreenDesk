'use strict';

const permissionName = 'maintenance.execute.skip_parts';
const previousDescription =
  'Enregistrer exceptionnellement un entretien sans remplacer les pièces prévues.';
const currentDescription =
  'Enregistrer exceptionnellement un entretien sans remplacer tout ou partie des pièces prévues.';

/** Clarifies that the existing skip-parts permission also covers partial replacement. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'UPDATE permissions SET description = $description, updated_at = $timestamp WHERE name = $name',
      { bind: { name: permissionName, description: currentDescription, timestamp: new Date() } },
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'UPDATE permissions SET description = $description, updated_at = $timestamp WHERE name = $name',
      { bind: { name: permissionName, description: previousDescription, timestamp: new Date() } },
    );
  },
};
