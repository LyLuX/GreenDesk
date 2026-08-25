'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET description = 'Modifier les informations générales des sociétés.', updated_at = NOW()
       WHERE name = 'companies.update'`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET description = 'Modifier les sociétés.', updated_at = NOW()
       WHERE name = 'companies.update'`,
    );
  },
};
