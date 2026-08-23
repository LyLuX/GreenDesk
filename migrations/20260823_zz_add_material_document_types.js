'use strict';

const previousDocumentTypes = ['invoice', 'manual', 'certificate', 'other'];
const currentDocumentTypes = [
  'invoice',
  'manual',
  'certificate',
  'exploded_view',
  'parts_list',
  'other',
];

/** Adds the exploded-view and parts-list classifications to material documents. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('material_files', 'document_type', {
      type: Sequelize.ENUM(...currentDocumentTypes),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "UPDATE material_files SET document_type = 'other' WHERE document_type IN ('exploded_view', 'parts_list')",
    );
    await queryInterface.changeColumn('material_files', 'document_type', {
      type: Sequelize.ENUM(...previousDocumentTypes),
      allowNull: true,
    });
  },
};
