'use strict';

/** Allows wear-based plans to have no calculated calendar deadline. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('maintenance_tasks', 'next_maintenance_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE maintenance_tasks
       SET next_maintenance_date = last_maintenance_date
       WHERE next_maintenance_date IS NULL`,
    );
    await queryInterface.changeColumn('maintenance_tasks', 'next_maintenance_date', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
  },
};
