'use strict';

/** Removes the redundant company business code; the UUID remains the stable identifier. */
module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('companies');
    if (table.code) await queryInterface.removeColumn('companies', 'code');
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('companies');
    if (table.code) return;

    await queryInterface.addColumn('companies', 'code', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      "UPDATE companies SET code = CONCAT('COMPANY_', id) WHERE code IS NULL",
    );
    await queryInterface.changeColumn('companies', 'code', {
      type: Sequelize.STRING(50),
      allowNull: false,
    });
    await queryInterface.addIndex('companies', ['code'], {
      name: 'companies_code_unique',
      unique: true,
    });
  },
};
