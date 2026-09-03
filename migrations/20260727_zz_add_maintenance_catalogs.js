'use strict';

const { randomUUID } = require('node:crypto');

const maintenanceTypes = [
  'preventive',
  'inspection',
  'replacement',
  'lubrication',
  'cleaning',
  'custom',
];

/**
 * Adds reusable operations and orderable parts without removing or rewriting
 * any legacy maintenance-plan field. The migration can therefore be reverted
 * independently from the application commit.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('maintenance_operations', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      maintenance_type: {
        type: Sequelize.ENUM(...maintenanceTypes),
        allowNull: false,
      },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      updated_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.createTable('maintenance_parts', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      manufacturer: { type: Sequelize.STRING(150), allowNull: true },
      reference: { type: Sequelize.STRING(150), allowNull: false },
      supplier_reference: { type: Sequelize.STRING(150), allowNull: true },
      unit: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'pièce' },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      updated_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addConstraint('maintenance_parts', {
      fields: ['manufacturer', 'reference'],
      type: 'unique',
      name: 'uq_maintenance_part_manufacturer_reference',
    });

    await queryInterface.addColumn('maintenance_tasks', 'operation_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: 'maintenance_operations', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.createTable('maintenance_task_parts', {
      maintenance_task_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        references: { model: 'maintenance_tasks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      maintenance_part_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        references: { model: 'maintenance_parts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    const [legacyPlans] = await queryInterface.sequelize.query(
      `SELECT title,
              MIN(maintenance_type) AS maintenanceType,
              MIN(description) AS description
       FROM maintenance_tasks
       WHERE deleted_at IS NULL
       GROUP BY title
       ORDER BY title`,
    );
    const timestamp = new Date();
    for (const plan of legacyPlans) {
      const operationUuid = randomUUID();
      await queryInterface.bulkInsert('maintenance_operations', [
        {
          uuid: operationUuid,
          name: plan.title,
          description: plan.description,
          maintenance_type: plan.maintenanceType,
          active: true,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
      const [operations] = await queryInterface.sequelize.query(
        'SELECT id FROM maintenance_operations WHERE uuid = $uuid',
        { bind: { uuid: operationUuid } },
      );
      await queryInterface.sequelize.query(
        `UPDATE maintenance_tasks
         SET operation_id = $operationId
         WHERE title = $title
           AND deleted_at IS NULL`,
        {
          bind: {
            operationId: operations[0].id,
            title: plan.title,
          },
        },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('maintenance_task_parts');
    await queryInterface.removeColumn('maintenance_tasks', 'operation_id');
    await queryInterface.dropTable('maintenance_parts');
    await queryInterface.dropTable('maintenance_operations');
  },
};
