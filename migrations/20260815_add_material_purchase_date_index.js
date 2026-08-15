'use strict';

const table = 'materials';
const indexName = 'idx_materials_active_purchase_date';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex(table, ['active', 'purchase_date', 'id'], {
      name: indexName,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(table, indexName);
  },
};
