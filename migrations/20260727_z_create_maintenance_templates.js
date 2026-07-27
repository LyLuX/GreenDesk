'use strict';

const { randomUUID } = require('node:crypto');

const legacyTaskColumns = ['title', 'description', 'maintenance_type', 'interval_days', 'priority'];

/** Replaces duplicated plan definitions with model-specific maintenance templates. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('maintenance_templates', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      brand_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'brands', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      material_model: { type: Sequelize.STRING(150), allowNull: false },
      title: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      maintenance_type: {
        type: Sequelize.ENUM(
          'preventive',
          'inspection',
          'replacement',
          'lubrication',
          'cleaning',
          'custom',
        ),
        allowNull: false,
      },
      interval_days: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'normal',
      },
      part_reference: { type: Sequelize.STRING(150), allowNull: true },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      instructions: { type: Sequelize.TEXT, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      updated_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addConstraint('maintenance_templates', {
      fields: ['brand_id', 'material_model', 'title'],
      type: 'unique',
      name: 'uq_maintenance_template_model_title',
    });

    await queryInterface.addColumn('maintenance_tasks', 'template_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: 'maintenance_templates', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    const [examples] = await queryInterface.sequelize.query(
      `SELECT mt.last_maintenance_date AS lastMaintenanceDate,
              mt.next_maintenance_date AS nextMaintenanceDate,
              mt.title,
              mt.description,
              mt.maintenance_type AS maintenanceType,
              mt.interval_days AS intervalDays,
              mt.priority,
              mt.notes,
              m.id AS materialId,
              m.brand_id AS brandId,
              m.model AS materialModel
       FROM maintenance_tasks mt
       INNER JOIN materials m ON m.id = mt.material_id
       INNER JOIN brands b ON b.id = m.brand_id
       WHERE mt.deleted_at IS NULL
         AND b.name = 'ECHO'
         AND m.model = 'CS-621SX'
         AND mt.title = 'Bougie'
       ORDER BY mt.id
       LIMIT 1`,
    );
    const example = examples[0];

    await queryInterface.bulkDelete('maintenance_history', {});
    await queryInterface.bulkDelete('maintenance_tasks', {});

    const taskColumns = await queryInterface.describeTable('maintenance_tasks');
    for (const column of legacyTaskColumns.filter((name) => taskColumns[name])) {
      await queryInterface.removeColumn('maintenance_tasks', column);
    }
    await queryInterface.changeColumn('maintenance_tasks', 'template_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'maintenance_templates', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.addConstraint('maintenance_tasks', {
      fields: ['material_id', 'template_id'],
      type: 'unique',
      name: 'uq_maintenance_task_material_template',
    });

    if (example) {
      const templateUuid = randomUUID();
      const timestamp = new Date();
      const referenceMatch = String(example.notes ?? '').match(/:\s*(.+)$/);
      await queryInterface.bulkInsert('maintenance_templates', [
        {
          uuid: templateUuid,
          brand_id: example.brandId,
          material_model: example.materialModel,
          title: example.title,
          description: example.description,
          maintenance_type: example.maintenanceType,
          interval_days: example.intervalDays,
          priority: example.priority,
          part_reference: referenceMatch?.[1]?.trim() || null,
          quantity: 1,
          instructions: null,
          active: true,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
      const [templates] = await queryInterface.sequelize.query(
        'SELECT id FROM maintenance_templates WHERE uuid = :uuid',
        { replacements: { uuid: templateUuid } },
      );
      await queryInterface.bulkInsert('maintenance_tasks', [
        {
          uuid: randomUUID(),
          material_id: example.materialId,
          template_id: templates[0].id,
          last_maintenance_date: example.lastMaintenanceDate,
          next_maintenance_date: example.nextMaintenanceDate,
          active: true,
          notes: null,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      'maintenance_tasks',
      'uq_maintenance_task_material_template',
    );
    await queryInterface.addColumn('maintenance_tasks', 'title', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn('maintenance_tasks', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('maintenance_tasks', 'maintenance_type', {
      type: Sequelize.ENUM(
        'preventive',
        'inspection',
        'replacement',
        'lubrication',
        'cleaning',
        'custom',
      ),
      allowNull: true,
    });
    await queryInterface.addColumn('maintenance_tasks', 'interval_days', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addColumn('maintenance_tasks', 'priority', {
      type: Sequelize.ENUM('low', 'normal', 'high', 'critical'),
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      `UPDATE maintenance_tasks mt
       INNER JOIN maintenance_templates template ON template.id = mt.template_id
       SET mt.title = template.title,
           mt.description = template.description,
           mt.maintenance_type = template.maintenance_type,
           mt.interval_days = template.interval_days,
           mt.priority = template.priority`,
    );
    await queryInterface.changeColumn('maintenance_tasks', 'title', {
      type: Sequelize.STRING(150),
      allowNull: false,
    });
    await queryInterface.changeColumn('maintenance_tasks', 'maintenance_type', {
      type: Sequelize.ENUM(
        'preventive',
        'inspection',
        'replacement',
        'lubrication',
        'cleaning',
        'custom',
      ),
      allowNull: false,
    });
    await queryInterface.changeColumn('maintenance_tasks', 'interval_days', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
    });
    await queryInterface.changeColumn('maintenance_tasks', 'priority', {
      type: Sequelize.ENUM('low', 'normal', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'normal',
    });
    await queryInterface.removeColumn('maintenance_tasks', 'template_id');
    await queryInterface.dropTable('maintenance_templates');
  },
};
