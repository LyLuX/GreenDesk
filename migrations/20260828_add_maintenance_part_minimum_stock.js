'use strict';

const { randomUUID } = require('node:crypto');
const permission = {
  name: 'maintenance.parts.stock.minimum.update',
  description: 'Modifier la quantité de stock minimum d’une pièce de maintenance.',
};
const sourcePermission = 'maintenance.parts.update';
const constraintName = 'chk_maintenance_parts_minimum_stock_quantity';

/** Adds a per-part minimum stock and its dedicated update permission. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('maintenance_parts', 'minimum_stock_quantity', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 1,
    });
    await queryInterface.sequelize.query('UPDATE maintenance_parts SET minimum_stock_quantity = 1');
    await queryInterface.addConstraint('maintenance_parts', {
      fields: ['minimum_stock_quantity'],
      type: 'check',
      name: constraintName,
      where: { minimum_stock_quantity: { [Sequelize.Op.between]: [0, 1000000] } },
    });

    const timestamp = new Date();
    await queryInterface.sequelize.query(
      'UPDATE permissions SET deleted_at = NULL, updated_at = :timestamp WHERE name = :name AND deleted_at IS NOT NULL',
      { replacements: { name: permission.name, timestamp } },
    );
    const [rows] = await queryInterface.sequelize.query(
      'SELECT name FROM permissions WHERE name = :name AND deleted_at IS NULL',
      { replacements: { name: permission.name } },
    );
    if (!rows.length) {
      await queryInterface.bulkInsert('permissions', [
        {
          uuid: randomUUID(),
          ...permission,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]);
    }
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
       SELECT :timestamp, :timestamp, grants.role_id, targetPermission.id
       FROM role_permissions AS grants
       INNER JOIN permissions AS sourcePermission
         ON sourcePermission.id = grants.permission_id
       INNER JOIN permissions AS targetPermission
         ON targetPermission.name = :targetName
       WHERE sourcePermission.name = :sourceName
         AND sourcePermission.deleted_at IS NULL
         AND targetPermission.deleted_at IS NULL`,
      {
        replacements: {
          sourceName: sourcePermission,
          targetName: permission.name,
          timestamp,
        },
      },
    );
    await queryInterface.sequelize.query(
      `UPDATE users AS users
       INNER JOIN user_roles AS userRoles ON userRoles.user_id = users.id
       INNER JOIN role_permissions AS grants ON grants.role_id = userRoles.role_id
       INNER JOIN permissions AS sourcePermission ON sourcePermission.id = grants.permission_id
       SET users.authorization_version = users.authorization_version + 1
       WHERE sourcePermission.name = :sourceName
         AND sourcePermission.deleted_at IS NULL`,
      { replacements: { sourceName: sourcePermission } },
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE users AS users
       INNER JOIN user_roles AS userRoles ON userRoles.user_id = users.id
       INNER JOIN role_permissions AS grants ON grants.role_id = userRoles.role_id
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       SET users.authorization_version = users.authorization_version + 1
       WHERE permissions.name = :name`,
      { replacements: { name: permission.name } },
    );
    await queryInterface.sequelize.query(
      `DELETE grants
       FROM role_permissions AS grants
       INNER JOIN permissions AS permissions ON permissions.id = grants.permission_id
       WHERE permissions.name = :name`,
      { replacements: { name: permission.name } },
    );
    await queryInterface.bulkDelete('permissions', { name: permission.name });
    await queryInterface.removeConstraint('maintenance_parts', constraintName);
    await queryInterface.removeColumn('maintenance_parts', 'minimum_stock_quantity');
  },
};
