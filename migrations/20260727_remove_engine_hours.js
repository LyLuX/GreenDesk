'use strict';

const maintenanceColumns = ['interval_hours', 'last_engine_hours', 'next_engine_hours'];

/** Removes engine-hour tracking while preserving all calendar-based maintenance plans. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [hourlyOnlyPlans] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS total
       FROM maintenance_tasks
       WHERE interval_days IS NULL`,
    );
    if (Number(hourlyOnlyPlans[0]?.total ?? 0) > 0) {
      throw new Error(
        'Impossible de supprimer les heures moteur : des plans ne possèdent aucun intervalle en jours.',
      );
    }

    await queryInterface.sequelize.query(
      `UPDATE audit_logs
       SET old_values = CASE
             WHEN old_values IS NULL THEN NULL
             WHEN entity = 'MATERIAL' THEN JSON_REMOVE(old_values, '$.engineHours')
             WHEN entity = 'MAINTENANCE_TASK' THEN
               JSON_REMOVE(old_values, '$.intervalHours', '$.lastEngineHours', '$.nextEngineHours')
             ELSE old_values
           END,
           new_values = CASE
             WHEN new_values IS NULL THEN NULL
             WHEN entity = 'MATERIAL' THEN JSON_REMOVE(new_values, '$.engineHours')
             WHEN entity = 'MAINTENANCE_TASK' THEN
               JSON_REMOVE(new_values, '$.intervalHours', '$.lastEngineHours', '$.nextEngineHours')
             ELSE new_values
           END
       WHERE entity IN ('MATERIAL', 'MAINTENANCE_TASK')`,
    );

    const historyColumns = await queryInterface.describeTable('maintenance_history');
    if (historyColumns.engine_hours)
      await queryInterface.removeColumn('maintenance_history', 'engine_hours');

    const taskColumns = await queryInterface.describeTable('maintenance_tasks');
    for (const column of maintenanceColumns.filter((name) => taskColumns[name])) {
      await queryInterface.removeColumn('maintenance_tasks', column);
    }
    await queryInterface.changeColumn('maintenance_tasks', 'interval_days', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
    });
    await queryInterface.changeColumn('maintenance_tasks', 'last_maintenance_date', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn('maintenance_tasks', 'next_maintenance_date', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });

    const materialColumns = await queryInterface.describeTable('materials');
    if (materialColumns.engine_hours)
      await queryInterface.removeColumn('materials', 'engine_hours');
  },

  async down(queryInterface, Sequelize) {
    const materialColumns = await queryInterface.describeTable('materials');
    if (!materialColumns.engine_hours)
      await queryInterface.addColumn('materials', 'engine_hours', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });

    await queryInterface.changeColumn('maintenance_tasks', 'interval_days', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.changeColumn('maintenance_tasks', 'last_maintenance_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.changeColumn('maintenance_tasks', 'next_maintenance_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    const taskColumns = await queryInterface.describeTable('maintenance_tasks');
    const taskDefinitions = {
      interval_hours: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      last_engine_hours: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      next_engine_hours: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
    };
    for (const [column, definition] of Object.entries(taskDefinitions)) {
      if (!taskColumns[column])
        await queryInterface.addColumn('maintenance_tasks', column, definition);
    }
    const indexes = await queryInterface.showIndex('maintenance_tasks');
    if (!indexes.some(({ name }) => name === 'idx_maintenance_hours'))
      await queryInterface.addIndex('maintenance_tasks', ['next_engine_hours'], {
        name: 'idx_maintenance_hours',
      });

    const historyColumns = await queryInterface.describeTable('maintenance_history');
    if (!historyColumns.engine_hours)
      await queryInterface.addColumn('maintenance_history', 'engine_hours', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
  },
};
