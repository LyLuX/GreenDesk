'use strict';

const hasColumn = async (queryInterface, table, column) =>
  Object.hasOwn(await queryInterface.describeTable(table), column);
const indexNames = async (queryInterface, table) =>
  new Set((await queryInterface.showIndex(table)).map((index) => index.name));

/** Adds a user-selected business date while preserving immutable creation timestamps. */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasColumn(queryInterface, 'inventory_stock_movements', 'performed_at'))) {
      await queryInterface.addColumn('inventory_stock_movements', 'performed_at', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }
    if (!(await hasColumn(queryInterface, 'maintenance_part_price_history', 'performed_at'))) {
      await queryInterface.addColumn('maintenance_part_price_history', 'performed_at', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(
      'UPDATE inventory_stock_movements SET performed_at = DATE(created_at)',
    );
    await queryInterface.sequelize.query(
      'UPDATE maintenance_part_price_history SET performed_at = DATE(created_at)',
    );

    await queryInterface.changeColumn('inventory_stock_movements', 'performed_at', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn('maintenance_part_price_history', 'performed_at', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });

    let indexes = await indexNames(queryInterface, 'inventory_stock_movements');
    if (!indexes.has('idx_stock_movements_stockable_performed')) {
      await queryInterface.addIndex(
        'inventory_stock_movements',
        ['stockable_type', 'stockable_id', 'performed_at', 'created_at'],
        { name: 'idx_stock_movements_stockable_performed' },
      );
    }
    if (indexes.has('idx_stock_movements_stockable_created')) {
      await queryInterface.removeIndex(
        'inventory_stock_movements',
        'idx_stock_movements_stockable_created',
      );
    }

    indexes = await indexNames(queryInterface, 'maintenance_part_price_history');
    if (!indexes.has('idx_maintenance_part_price_history_part_performed')) {
      await queryInterface.addIndex(
        'maintenance_part_price_history',
        ['maintenance_part_id', 'performed_at', 'created_at'],
        { name: 'idx_maintenance_part_price_history_part_performed' },
      );
    }
    if (indexes.has('idx_maintenance_part_price_history_part_created')) {
      await queryInterface.removeIndex(
        'maintenance_part_price_history',
        'idx_maintenance_part_price_history_part_created',
      );
    }
  },

  async down(queryInterface) {
    let indexes = await indexNames(queryInterface, 'maintenance_part_price_history');
    if (!indexes.has('idx_maintenance_part_price_history_part_created')) {
      await queryInterface.addIndex(
        'maintenance_part_price_history',
        ['maintenance_part_id', 'created_at'],
        { name: 'idx_maintenance_part_price_history_part_created' },
      );
    }
    if (indexes.has('idx_maintenance_part_price_history_part_performed')) {
      await queryInterface.removeIndex(
        'maintenance_part_price_history',
        'idx_maintenance_part_price_history_part_performed',
      );
    }

    indexes = await indexNames(queryInterface, 'inventory_stock_movements');
    if (!indexes.has('idx_stock_movements_stockable_created')) {
      await queryInterface.addIndex(
        'inventory_stock_movements',
        ['stockable_type', 'stockable_id', 'created_at'],
        { name: 'idx_stock_movements_stockable_created' },
      );
    }
    if (indexes.has('idx_stock_movements_stockable_performed')) {
      await queryInterface.removeIndex(
        'inventory_stock_movements',
        'idx_stock_movements_stockable_performed',
      );
    }

    if (await hasColumn(queryInterface, 'maintenance_part_price_history', 'performed_at')) {
      await queryInterface.removeColumn('maintenance_part_price_history', 'performed_at');
    }
    if (await hasColumn(queryInterface, 'inventory_stock_movements', 'performed_at')) {
      await queryInterface.removeColumn('inventory_stock_movements', 'performed_at');
    }
  },
};
