'use strict';

/**
 * Removes the unused material sale price from the schema and historic audits.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE audit_logs
       SET old_values = CASE WHEN old_values IS NULL THEN NULL ELSE JSON_REMOVE(old_values, '$.salePrice') END,
           new_values = CASE WHEN new_values IS NULL THEN NULL ELSE JSON_REMOVE(new_values, '$.salePrice') END
       WHERE entity = 'MATERIAL'`,
    );
    const columns = await queryInterface.describeTable('materials');
    if (columns.sale_price) await queryInterface.removeColumn('materials', 'sale_price');
  },

  async down(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('materials');
    if (!columns.sale_price)
      await queryInterface.addColumn('materials', 'sale_price', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      });
  },
};
