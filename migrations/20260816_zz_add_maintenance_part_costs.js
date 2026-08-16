'use strict';

/** Adds current part prices and immutable ledgers for price changes and maintenance usage costs. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('maintenance_parts', 'unit_price', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.createTable('maintenance_part_price_history', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      maintenance_part_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'maintenance_parts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      previous_unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      changed_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(
      'maintenance_part_price_history',
      ['maintenance_part_id', 'created_at'],
      { name: 'idx_maintenance_part_price_history_part_created' },
    );

    await queryInterface.createTable('maintenance_part_usages', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      maintenance_history_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'maintenance_history', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      maintenance_part_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'maintenance_parts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      part_uuid: { type: Sequelize.UUID, allowNull: false },
      part_name: { type: Sequelize.STRING(150), allowNull: false },
      part_reference: { type: Sequelize.STRING(150), allowNull: false },
      unit: { type: Sequelize.STRING(50), allowNull: false },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      total_cost: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      performed_at: { type: Sequelize.DATEONLY, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('maintenance_part_usages', {
      fields: ['maintenance_history_id', 'maintenance_part_id'],
      type: 'unique',
      name: 'uq_maintenance_part_usages_history_part',
    });
    await queryInterface.addIndex('maintenance_part_usages', ['maintenance_part_id'], {
      name: 'idx_maintenance_part_usages_part',
    });
    await queryInterface.addIndex('maintenance_part_usages', ['performed_at'], {
      name: 'idx_maintenance_part_usages_performed',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('maintenance_part_usages');
    await queryInterface.dropTable('maintenance_part_price_history');
    await queryInterface.removeColumn('maintenance_parts', 'unit_price');
  },
};
