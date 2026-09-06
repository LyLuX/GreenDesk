'use strict';

const permissionName = 'maintenance.execute';
const previousDescription =
  'Enregistrer un entretien réalisé et recalculer ses prochaines échéances.';
const currentDescription =
  'Exécuter un plan de maintenance, y compris consommer les pièces prévues par ce plan, et recalculer ses prochaines échéances.';

/** Updates the existing permission label without changing any role assignment or access right. */
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
