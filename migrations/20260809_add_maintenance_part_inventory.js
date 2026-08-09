'use strict';

/** Adds a reusable stock state and its current quantity to maintenance parts. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('maintenance_parts', 'stock_status', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'toOrder',
    });
    await queryInterface.addColumn('maintenance_parts', 'stock_quantity', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addIndex('maintenance_parts', ['stock_status'], {
      name: 'idx_maintenance_parts_stock_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('maintenance_parts', 'idx_maintenance_parts_stock_status');
    await queryInterface.removeColumn('maintenance_parts', 'stock_quantity');
    await queryInterface.removeColumn('maintenance_parts', 'stock_status');
  },
};
