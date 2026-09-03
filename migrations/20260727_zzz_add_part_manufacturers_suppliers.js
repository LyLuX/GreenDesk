'use strict';

const { randomUUID } = require('node:crypto');

const directoryColumns = (Sequelize) => ({
  id: {
    type: Sequelize.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
  name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
  active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
  created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
  updated_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
  deleted_at: { type: Sequelize.DATE, allowNull: true },
});

/**
 * Adds normalized part manufacturers and suppliers while preserving the
 * existing manufacturer text on every part for backward compatibility.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('maintenance_part_manufacturers', {
      ...directoryColumns(Sequelize),
      notes: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.createTable('maintenance_suppliers', {
      ...directoryColumns(Sequelize),
      contact_name: { type: Sequelize.STRING(150), allowNull: true },
      email: { type: Sequelize.STRING(254), allowNull: true },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addColumn('maintenance_parts', 'manufacturer_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: 'maintenance_part_manufacturers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('maintenance_parts', 'supplier_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: 'maintenance_suppliers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('maintenance_parts', 'supplier', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });

    const [legacyManufacturers] = await queryInterface.sequelize.query(
      `SELECT DISTINCT TRIM(manufacturer) AS name
       FROM maintenance_parts
       WHERE manufacturer IS NOT NULL
         AND TRIM(manufacturer) <> ''
       ORDER BY name`,
    );
    const timestamp = new Date();
    for (const manufacturer of legacyManufacturers) {
      const uuid = randomUUID();
      await queryInterface.bulkInsert('maintenance_part_manufacturers', [
        {
          uuid,
          name: manufacturer.name,
          active: true,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
      const [created] = await queryInterface.sequelize.query(
        'SELECT id FROM maintenance_part_manufacturers WHERE uuid = $uuid',
        { bind: { uuid } },
      );
      await queryInterface.sequelize.query(
        `UPDATE maintenance_parts
         SET manufacturer_id = $manufacturerId
         WHERE TRIM(manufacturer) = $name`,
        {
          bind: {
            manufacturerId: created[0].id,
            name: manufacturer.name,
          },
        },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('maintenance_parts', 'supplier');
    await queryInterface.removeColumn('maintenance_parts', 'supplier_id');
    await queryInterface.removeColumn('maintenance_parts', 'manufacturer_id');
    await queryInterface.dropTable('maintenance_suppliers');
    await queryInterface.dropTable('maintenance_part_manufacturers');
  },
};
