'use strict';

const permissionNames = [
  'properties.read',
  'properties.create',
  'properties.update',
  'properties.delete',
  'properties.disable',
];

const tableName = (table) => (typeof table === 'string' ? table : table.tableName);

/** Removes the unused Property feature from databases that already contain it. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map(tableName);

    if (tables.includes('materials')) {
      const columns = await queryInterface.describeTable('materials');
      if (columns.property_id) {
        const references = await queryInterface.getForeignKeyReferencesForTable('materials');
        for (const reference of references.filter(
          (item) => item.columnName === 'property_id' && item.constraintName,
        )) {
          await queryInterface.removeConstraint('materials', reference.constraintName);
        }
        await queryInterface.removeColumn('materials', 'property_id');
      }
    }

    if (tables.includes('permissions')) {
      const permissions = await queryInterface.sequelize.query(
        'SELECT id FROM permissions WHERE name IN (:names)',
        {
          replacements: { names: permissionNames },
          type: Sequelize.QueryTypes.SELECT,
        },
      );
      const permissionIds = permissions.map(({ id }) => id);
      if (permissionIds.length && tables.includes('role_permissions')) {
        await queryInterface.bulkDelete('role_permissions', {
          permission_id: { [Sequelize.Op.in]: permissionIds },
        });
      }
      await queryInterface.bulkDelete('permissions', {
        name: { [Sequelize.Op.in]: permissionNames },
      });
    }

    if (tables.includes('properties')) await queryInterface.dropTable('properties');
  },

  async down(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map(tableName);
    if (!tables.includes('properties')) {
      await queryInterface.createTable('properties', {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
        name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
        type: { type: Sequelize.STRING(50), allowNull: false },
        unit: { type: Sequelize.STRING(50), allowNull: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
        updated_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      });
    }
    const columns = await queryInterface.describeTable('materials');
    if (!columns.property_id) {
      await queryInterface.addColumn('materials', 'property_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'properties', key: 'id' },
        onDelete: 'SET NULL',
      });
    }
  },
};
