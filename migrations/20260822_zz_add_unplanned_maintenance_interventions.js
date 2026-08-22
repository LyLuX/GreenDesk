'use strict';

const { randomUUID } = require('node:crypto');

const permissionName = 'maintenance.parts.stock.consume';
const sourcePermission = 'maintenance.execute';
const tableExists = async (queryInterface, table) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((entry) => (typeof entry === 'string' ? entry : entry.tableName) === table);
};
const hasColumn = async (queryInterface, table, column) =>
  Object.hasOwn(await queryInterface.describeTable(table), column);
const hasIndex = async (queryInterface, table, name) =>
  (await queryInterface.showIndex(table)).some((index) => index.name === name);

/** Adds unplanned maintenance interventions and links their consumed-part costs to existing stats. */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'maintenance_interventions'))) {
      await queryInterface.createTable('maintenance_interventions', {
        id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
        material_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'materials', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        description: { type: Sequelize.TEXT, allowNull: false },
        performed_at: { type: Sequelize.DATEONLY, allowNull: false },
        performed_by: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_at: { type: Sequelize.DATE, allowNull: false },
      });
    }
    if (
      !(await hasIndex(
        queryInterface,
        'maintenance_interventions',
        'idx_maintenance_interventions_material_performed',
      ))
    ) {
      await queryInterface.addIndex('maintenance_interventions', ['material_id', 'performed_at'], {
        name: 'idx_maintenance_interventions_material_performed',
      });
    }

    if (
      !(await hasColumn(queryInterface, 'maintenance_part_usages', 'maintenance_intervention_id'))
    ) {
      await queryInterface.addColumn('maintenance_part_usages', 'maintenance_intervention_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'maintenance_interventions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
    if (
      !(await hasIndex(
        queryInterface,
        'maintenance_part_usages',
        'uq_maintenance_part_usages_intervention_part',
      ))
    ) {
      await queryInterface.addConstraint('maintenance_part_usages', {
        fields: ['maintenance_intervention_id', 'maintenance_part_id'],
        type: 'unique',
        name: 'uq_maintenance_part_usages_intervention_part',
      });
    }

    const timestamp = new Date();
    await queryInterface.sequelize.query(
      'UPDATE permissions SET deleted_at = NULL, updated_at = :timestamp WHERE name = :name AND deleted_at IS NOT NULL',
      { replacements: { name: permissionName, timestamp } },
    );
    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM permissions WHERE name = :name AND deleted_at IS NULL',
      { replacements: { name: permissionName } },
    );
    if (!existing.length) {
      await queryInterface.bulkInsert('permissions', [
        {
          uuid: randomUUID(),
          name: permissionName,
          description:
            'Enregistrer une pièce utilisée lors d’une intervention de maintenance ponctuelle.',
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
    }
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
       SELECT :timestamp, :timestamp, grants.role_id, target.id
       FROM role_permissions AS grants
       INNER JOIN permissions AS source ON source.id = grants.permission_id
       INNER JOIN permissions AS target ON target.name = :targetName
       WHERE source.name = :sourceName AND source.deleted_at IS NULL AND target.deleted_at IS NULL`,
      { replacements: { timestamp, sourceName: sourcePermission, targetName: permissionName } },
    );
    await queryInterface.sequelize.query(
      `UPDATE users AS users
       INNER JOIN user_roles AS userRoles ON userRoles.user_id = users.id
       INNER JOIN role_permissions AS grants ON grants.role_id = userRoles.role_id
       INNER JOIN permissions AS source ON source.id = grants.permission_id
       SET users.authorization_version = users.authorization_version + 1
       WHERE source.name = :sourceName AND source.deleted_at IS NULL`,
      { replacements: { sourceName: sourcePermission } },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `DELETE grants FROM role_permissions AS grants
       INNER JOIN permissions AS permission ON permission.id = grants.permission_id
       WHERE permission.name = :name`,
      { replacements: { name: permissionName } },
    );
    await queryInterface.bulkDelete('permissions', { name: permissionName });
    await queryInterface.removeConstraint(
      'maintenance_part_usages',
      'uq_maintenance_part_usages_intervention_part',
    );
    await queryInterface.removeColumn('maintenance_part_usages', 'maintenance_intervention_id');
    await queryInterface.dropTable('maintenance_interventions');
  },
};
