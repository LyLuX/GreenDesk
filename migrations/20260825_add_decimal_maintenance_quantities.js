'use strict';

const MAX_QUANTITY = 1000000;

const constrainedColumns = [
  {
    table: 'maintenance_parts',
    column: 'quantity_on_hand',
    constraint: 'chk_maintenance_parts_quantity_on_hand',
  },
  {
    table: 'maintenance_parts',
    column: 'quantity_on_order',
    constraint: 'chk_maintenance_parts_quantity_on_order',
  },
  {
    table: 'inventory_stock_movements',
    column: 'quantity_on_hand_after',
    constraint: 'chk_stock_movements_quantity_on_hand_after',
  },
  {
    table: 'inventory_stock_movements',
    column: 'quantity_on_order_after',
    constraint: 'chk_stock_movements_quantity_on_order_after',
  },
];

const positiveQuantityColumns = [
  {
    table: 'maintenance_task_parts',
    column: 'quantity',
    maximum: 100000,
    constraint: 'chk_maintenance_task_parts_quantity',
  },
  {
    table: 'maintenance_part_usages',
    column: 'quantity',
    maximum: MAX_QUANTITY,
    constraint: 'chk_maintenance_part_usages_quantity',
  },
];

const changeQuantityColumns = async (queryInterface, nonNegativeType, signedType) => {
  await queryInterface.changeColumn('maintenance_task_parts', 'quantity', {
    type: nonNegativeType,
    allowNull: false,
    defaultValue: 1,
  });
  await queryInterface.changeColumn('maintenance_part_usages', 'quantity', {
    type: nonNegativeType,
    allowNull: false,
  });
  await queryInterface.changeColumn('maintenance_parts', 'quantity_on_hand', {
    type: nonNegativeType,
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.changeColumn('maintenance_parts', 'quantity_on_order', {
    type: nonNegativeType,
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.changeColumn('inventory_stock_movements', 'quantity_on_hand_change', {
    type: signedType,
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.changeColumn('inventory_stock_movements', 'quantity_on_order_change', {
    type: signedType,
    allowNull: false,
    defaultValue: 0,
  });
  await queryInterface.changeColumn('inventory_stock_movements', 'quantity_on_hand_after', {
    type: nonNegativeType,
    allowNull: false,
  });
  await queryInterface.changeColumn('inventory_stock_movements', 'quantity_on_order_after', {
    type: nonNegativeType,
    allowNull: false,
  });
};

const removeQuantityConstraints = async (queryInterface) => {
  for (const { table, constraint } of constrainedColumns) {
    await queryInterface.sequelize.query(`ALTER TABLE \`${table}\` DROP CHECK \`${constraint}\``);
  }
};

const addQuantityConstraints = async (queryInterface, Sequelize) => {
  for (const { table, column, constraint } of constrainedColumns) {
    await queryInterface.addConstraint(table, {
      fields: [column],
      type: 'check',
      where: { [column]: { [Sequelize.Op.between]: [0, MAX_QUANTITY] } },
      name: constraint,
    });
  }
  for (const { table, column, maximum, constraint } of positiveQuantityColumns) {
    await queryInterface.addConstraint(table, {
      fields: [column],
      type: 'check',
      where: { [column]: { [Sequelize.Op.between]: [0.01, maximum] } },
      name: constraint,
    });
  }
};

const removePositiveQuantityConstraints = async (queryInterface) => {
  for (const { table, constraint } of positiveQuantityColumns) {
    await queryInterface.sequelize.query(`ALTER TABLE \`${table}\` DROP CHECK \`${constraint}\``);
  }
};

/** Allows litres and other maintenance quantities to be stored with two decimal places. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await removeQuantityConstraints(queryInterface);
    await changeQuantityColumns(queryInterface, Sequelize.DECIMAL(12, 2), Sequelize.DECIMAL(12, 2));
    await addQuantityConstraints(queryInterface, Sequelize);
  },

  async down(queryInterface, Sequelize) {
    await removePositiveQuantityConstraints(queryInterface);
    await removeQuantityConstraints(queryInterface);
    await changeQuantityColumns(queryInterface, Sequelize.INTEGER.UNSIGNED, Sequelize.INTEGER);
    for (const { table, column, constraint } of constrainedColumns) {
      await queryInterface.addConstraint(table, {
        fields: [column],
        type: 'check',
        where: { [column]: { [Sequelize.Op.between]: [0, MAX_QUANTITY] } },
        name: constraint,
      });
    }
  },
};
