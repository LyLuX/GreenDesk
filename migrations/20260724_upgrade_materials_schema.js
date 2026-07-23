'use strict';

/** Adds Sprint 5 material fields to databases created before the fleet module. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('materials');
    const additions = {
      brand_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      category_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      property_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      model: { type: Sequelize.STRING(150), allowNull: true },
      serial_number: { type: Sequelize.STRING(150), allowNull: true, unique: true },
      year: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      purchase_date: { type: Sequelize.DATEONLY, allowNull: true },
      current_value: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      engine_hours: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      commissioned_at: { type: Sequelize.DATEONLY, allowNull: true },
      retired_at: { type: Sequelize.DATEONLY, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
    };

    for (const [column, definition] of Object.entries(additions)) {
      if (!columns[column]) await queryInterface.addColumn('materials', column, definition);
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('materials');
    const additions = [
      'brand_id',
      'category_id',
      'property_id',
      'model',
      'serial_number',
      'year',
      'purchase_date',
      'current_value',
      'engine_hours',
      'commissioned_at',
      'retired_at',
      'notes',
    ];

    for (const column of additions.filter((name) => columns[name])) {
      await queryInterface.removeColumn('materials', column);
    }
  },
};
