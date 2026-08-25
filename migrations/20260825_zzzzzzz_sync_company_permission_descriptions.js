'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET description = 'Accéder aux données de toutes les sociétés sans restriction d’appartenance.',
           updated_at = NOW()
       WHERE name = 'companies.access.all'`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET description = 'Accéder aux données de toutes les sociétés.', updated_at = NOW()
       WHERE name = 'companies.access.all'`,
    );
  },
};
