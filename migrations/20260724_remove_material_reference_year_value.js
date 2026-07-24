'use strict';

const removedColumns = ['reference', 'year', 'current_value'];

/** Removes unused material attributes and their historic audit values. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE audit_logs
       SET old_values = CASE
             WHEN old_values IS NULL THEN NULL
             ELSE JSON_REMOVE(old_values, '$.reference', '$.year', '$.currentValue')
           END,
           new_values = CASE
             WHEN new_values IS NULL THEN NULL
             ELSE JSON_REMOVE(new_values, '$.reference', '$.year', '$.currentValue')
           END
       WHERE entity = 'MATERIAL'`,
    );

    const columns = await queryInterface.describeTable('materials');
    for (const column of removedColumns.filter((name) => columns[name])) {
      await queryInterface.removeColumn('materials', column);
    }
  },

  async down(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('materials');
    if (!columns.reference)
      await queryInterface.addColumn('materials', 'reference', {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      });
    if (!columns.year)
      await queryInterface.addColumn('materials', 'year', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    if (!columns.current_value)
      await queryInterface.addColumn('materials', 'current_value', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      });
  },
};
