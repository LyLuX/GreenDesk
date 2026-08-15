'use strict';

/** Adds the counter used to invalidate every active JWT for a user. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('users');
    if (columns.authorization_version) return;
    await queryInterface.addColumn('users', 'authorization_version', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('users');
    if (!columns.authorization_version) return;
    await queryInterface.removeColumn('users', 'authorization_version');
  },
};
