'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('part_manufacturers', 'description');
    await queryInterface.removeColumn('part_manufacturers', 'notes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('part_manufacturers', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('part_manufacturers', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
};
