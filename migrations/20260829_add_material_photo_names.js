'use strict';

/** Adds an optional user-facing name to material photos. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('material_files', 'name', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('material_files', 'name');
  },
};
