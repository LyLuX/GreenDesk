'use strict';

const table = 'maintenance_parts';
const indexName = 'idx_maintenance_parts_active_stock_quantities';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex(table, ['active', 'quantity_on_hand', 'quantity_on_order'], {
      name: indexName,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(table, indexName);
  },
};
