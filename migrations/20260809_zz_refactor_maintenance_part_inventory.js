'use strict';

const MAX_QUANTITY = 1000000;

/**
 * Separates workshop and ordered quantities and introduces a reusable,
 * immutable movement journal. Existing single-status values are preserved.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('maintenance_parts', 'quantity_on_hand', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('maintenance_parts', 'quantity_on_order', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.sequelize.query(
      `UPDATE maintenance_parts
       SET quantity_on_hand = CASE WHEN stock_status = 'inStock' THEN stock_quantity ELSE 0 END,
           quantity_on_order = CASE WHEN stock_status = 'ordered' THEN stock_quantity ELSE 0 END`,
    );

    await queryInterface.addConstraint('maintenance_parts', {
      fields: ['quantity_on_hand'],
      type: 'check',
      where: { quantity_on_hand: { [Sequelize.Op.between]: [0, MAX_QUANTITY] } },
      name: 'chk_maintenance_parts_quantity_on_hand',
    });
    await queryInterface.addConstraint('maintenance_parts', {
      fields: ['quantity_on_order'],
      type: 'check',
      where: { quantity_on_order: { [Sequelize.Op.between]: [0, MAX_QUANTITY] } },
      name: 'chk_maintenance_parts_quantity_on_order',
    });

    await queryInterface.createTable('inventory_stock_movements', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      stockable_type: { type: Sequelize.STRING(60), allowNull: false },
      stockable_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      operation: { type: Sequelize.STRING(30), allowNull: false },
      quantity_on_hand_change: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      quantity_on_order_change: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      quantity_on_hand_after: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      quantity_on_order_after: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      source_type: { type: Sequelize.STRING(60), allowNull: true },
      source_uuid: { type: Sequelize.UUID, allowNull: true },
      performed_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(
      'inventory_stock_movements',
      ['stockable_type', 'stockable_id', 'created_at'],
      { name: 'idx_stock_movements_stockable_created' },
    );
    await queryInterface.addConstraint('inventory_stock_movements', {
      fields: ['quantity_on_hand_change', 'quantity_on_order_change'],
      type: 'check',
      where: {
        [Sequelize.Op.or]: [
          { quantity_on_hand_change: { [Sequelize.Op.ne]: 0 } },
          { quantity_on_order_change: { [Sequelize.Op.ne]: 0 } },
        ],
      },
      name: 'chk_stock_movements_non_zero_change',
    });
    await queryInterface.addConstraint('inventory_stock_movements', {
      fields: ['quantity_on_hand_after'],
      type: 'check',
      where: { quantity_on_hand_after: { [Sequelize.Op.between]: [0, MAX_QUANTITY] } },
      name: 'chk_stock_movements_quantity_on_hand_after',
    });
    await queryInterface.addConstraint('inventory_stock_movements', {
      fields: ['quantity_on_order_after'],
      type: 'check',
      where: { quantity_on_order_after: { [Sequelize.Op.between]: [0, MAX_QUANTITY] } },
      name: 'chk_stock_movements_quantity_on_order_after',
    });

    await queryInterface.sequelize.query(
      `INSERT INTO inventory_stock_movements
         (uuid, stockable_type, stockable_id, operation,
          quantity_on_hand_change, quantity_on_order_change,
          quantity_on_hand_after, quantity_on_order_after, created_at)
       SELECT UUID(), 'maintenancePart', id, 'migrate',
              quantity_on_hand, quantity_on_order,
              quantity_on_hand, quantity_on_order, CURRENT_TIMESTAMP
       FROM maintenance_parts
       WHERE quantity_on_hand > 0 OR quantity_on_order > 0`,
    );

    await queryInterface.removeIndex('maintenance_parts', 'idx_maintenance_parts_stock_status');
    await queryInterface.removeColumn('maintenance_parts', 'stock_quantity');
    await queryInterface.removeColumn('maintenance_parts', 'stock_status');
  },

  async down(queryInterface, Sequelize) {
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
    await queryInterface.sequelize.query(
      `UPDATE maintenance_parts
       SET stock_status = CASE
             WHEN quantity_on_hand > 0 THEN 'inStock'
             WHEN quantity_on_order > 0 THEN 'ordered'
             ELSE 'toOrder'
           END,
           stock_quantity = CASE
             WHEN quantity_on_hand > 0 THEN quantity_on_hand
             ELSE quantity_on_order
           END`,
    );
    await queryInterface.addIndex('maintenance_parts', ['stock_status'], {
      name: 'idx_maintenance_parts_stock_status',
    });

    await queryInterface.dropTable('inventory_stock_movements');
    await queryInterface.removeConstraint(
      'maintenance_parts',
      'chk_maintenance_parts_quantity_on_order',
    );
    await queryInterface.removeConstraint(
      'maintenance_parts',
      'chk_maintenance_parts_quantity_on_hand',
    );
    await queryInterface.removeColumn('maintenance_parts', 'quantity_on_order');
    await queryInterface.removeColumn('maintenance_parts', 'quantity_on_hand');
  },
};
