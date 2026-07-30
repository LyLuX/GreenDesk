'use strict';

const foreignKeysForColumn = async (queryInterface, table, column) => {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME AS name
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
       AND COLUMN_NAME = :column
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: { table, column } },
  );
  return constraints;
};

const replaceForeignKey = async (
  queryInterface,
  Sequelize,
  { table, column, allowNull, referencedTable, constraintName, onDelete },
) => {
  for (const constraint of await foreignKeysForColumn(queryInterface, table, column)) {
    await queryInterface.removeConstraint(table, constraint.name);
  }
  await queryInterface.changeColumn(table, column, {
    type: Sequelize.BIGINT.UNSIGNED,
    allowNull,
  });
  await queryInterface.addConstraint(table, {
    fields: [column],
    type: 'foreign key',
    name: constraintName,
    references: { table: referencedTable, field: 'id' },
    onUpdate: 'CASCADE',
    onDelete,
  });
};

const assertNoNullReferences = async (queryInterface, table, column) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS count FROM \`${table}\` WHERE \`${column}\` IS NULL`,
  );
  if (Number(rows[0].count)) {
    throw new Error(`Cannot make ${table}.${column} mandatory while null references still exist`);
  }
};

/**
 * Aligns the installed foreign keys with the mandatory model relationships.
 *
 * Existing active plans attached to inactive materials are deactivated with
 * their parent material's updated_at value. That shared timestamp lets the
 * application safely restore only plans disabled by the same material event.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE materials
       SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
       WHERE active = 0`,
    );
    await queryInterface.sequelize.query(
      `UPDATE maintenance_tasks AS task
       INNER JOIN materials AS material ON material.id = task.material_id
       SET task.active = 0,
           task.updated_at = material.updated_at
       WHERE task.deleted_at IS NULL
         AND task.active = 1
         AND (material.active = 0 OR material.deleted_at IS NOT NULL)`,
    );

    await queryInterface.sequelize.query(
      `UPDATE materials AS material
       LEFT JOIN categories AS category ON category.id = material.category_id
       SET material.category_id = NULL
       WHERE material.category_id IS NOT NULL
         AND category.id IS NULL`,
    );

    await assertNoNullReferences(queryInterface, 'material_files', 'material_id');
    await assertNoNullReferences(queryInterface, 'maintenance_tasks', 'material_id');
    await assertNoNullReferences(queryInterface, 'maintenance_history', 'maintenance_task_id');

    await replaceForeignKey(queryInterface, Sequelize, {
      table: 'materials',
      column: 'category_id',
      allowNull: true,
      referencedTable: 'categories',
      constraintName: 'fk_materials_category',
      onDelete: 'SET NULL',
    });
    await replaceForeignKey(queryInterface, Sequelize, {
      table: 'material_files',
      column: 'material_id',
      allowNull: false,
      referencedTable: 'materials',
      constraintName: 'fk_material_files_material',
      onDelete: 'CASCADE',
    });
    await replaceForeignKey(queryInterface, Sequelize, {
      table: 'maintenance_tasks',
      column: 'material_id',
      allowNull: false,
      referencedTable: 'materials',
      constraintName: 'fk_maintenance_material',
      onDelete: 'CASCADE',
    });
    await replaceForeignKey(queryInterface, Sequelize, {
      table: 'maintenance_history',
      column: 'maintenance_task_id',
      allowNull: false,
      referencedTable: 'maintenance_tasks',
      constraintName: 'fk_maintenance_history_task',
      onDelete: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    await replaceForeignKey(queryInterface, Sequelize, {
      table: 'maintenance_history',
      column: 'maintenance_task_id',
      allowNull: true,
      referencedTable: 'maintenance_tasks',
      constraintName: 'fk_maintenance_history_task',
      onDelete: 'SET NULL',
    });
    await replaceForeignKey(queryInterface, Sequelize, {
      table: 'maintenance_tasks',
      column: 'material_id',
      allowNull: true,
      referencedTable: 'materials',
      constraintName: 'fk_maintenance_material',
      onDelete: 'SET NULL',
    });
    await replaceForeignKey(queryInterface, Sequelize, {
      table: 'material_files',
      column: 'material_id',
      allowNull: true,
      referencedTable: 'materials',
      constraintName: 'fk_material_files_material',
      onDelete: 'SET NULL',
    });
    for (const constraint of await foreignKeysForColumn(
      queryInterface,
      'materials',
      'category_id',
    )) {
      await queryInterface.removeConstraint('materials', constraint.name);
    }
  },
};
