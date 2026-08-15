'use strict';

const STANDARD_EXECUTION = 'standard';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('maintenance_history');
    if (!columns.execution_type) {
      await queryInterface.addColumn('maintenance_history', 'execution_type', {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: STANDARD_EXECUTION,
      });
    }
    if (!columns.parts_snapshot) {
      await queryInterface.addColumn('maintenance_history', 'parts_snapshot', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('maintenance_history');
    if (columns.parts_snapshot) {
      await queryInterface.removeColumn('maintenance_history', 'parts_snapshot');
    }
    if (columns.execution_type) {
      await queryInterface.removeColumn('maintenance_history', 'execution_type');
    }
  },
};
