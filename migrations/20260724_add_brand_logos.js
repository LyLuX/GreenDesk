'use strict';

/** Adds optional file metadata for protected brand logos. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('brands');
    const additions = {
      logo_file_name: { type: Sequelize.STRING(255), allowNull: true },
      logo_original_name: { type: Sequelize.STRING(255), allowNull: true },
      logo_mime_type: { type: Sequelize.STRING(100), allowNull: true },
    };
    for (const [column, definition] of Object.entries(additions)) {
      if (!columns[column]) await queryInterface.addColumn('brands', column, definition);
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('brands');
    for (const column of ['logo_file_name', 'logo_original_name', 'logo_mime_type']) {
      if (columns[column]) await queryInterface.removeColumn('brands', column);
    }
  },
};
