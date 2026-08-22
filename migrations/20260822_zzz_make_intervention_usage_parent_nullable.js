'use strict';

const historyForeignKeys = async (queryInterface) =>
  (await queryInterface.getForeignKeyReferencesForTable('maintenance_part_usages')).filter(
    ({ columnName }) => columnName === 'maintenance_history_id',
  );

const removeHistoryForeignKeys = async (queryInterface) => {
  for (const foreignKey of await historyForeignKeys(queryInterface)) {
    await queryInterface.removeConstraint(
      'maintenance_part_usages',
      foreignKey.constraintName ?? foreignKey.constraint_name,
    );
  }
};

const addHistoryForeignKey = (queryInterface) =>
  queryInterface.addConstraint('maintenance_part_usages', {
    fields: ['maintenance_history_id'],
    type: 'foreign key',
    name: 'fk_maintenance_part_usages_history',
    references: { table: 'maintenance_history', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

/** Makes plan history optional for usage rows owned by an unplanned intervention. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await removeHistoryForeignKeys(queryInterface);
    await queryInterface.changeColumn('maintenance_part_usages', 'maintenance_history_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
    });
    await addHistoryForeignKey(queryInterface);
  },

  async down(queryInterface, Sequelize) {
    await removeHistoryForeignKeys(queryInterface);
    await queryInterface.changeColumn('maintenance_part_usages', 'maintenance_history_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
    });
    await addHistoryForeignKey(queryInterface);
  },
};
