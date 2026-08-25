'use strict';

const tenantTables = [
  'categories',
  'part_manufacturers',
  'suppliers',
  'materials',
  'material_files',
  'maintenance_operations',
  'maintenance_parts',
  'maintenance_tasks',
  'maintenance_task_parts',
  'maintenance_history',
  'maintenance_interventions',
  'maintenance_part_usages',
  'maintenance_part_price_history',
  'inventory_stock_movements',
];

module.exports = {
  async up(queryInterface) {
    for (const table of tenantTables) {
      await queryInterface.sequelize.query(
        `ALTER TABLE ${table} MODIFY company_id BIGINT UNSIGNED NOT NULL`,
      );
    }
  },

  async down(queryInterface) {
    for (const table of [...tenantTables].reverse()) {
      await queryInterface.sequelize.query(
        `ALTER TABLE ${table} MODIFY company_id BIGINT UNSIGNED NULL`,
      );
    }
  },
};
