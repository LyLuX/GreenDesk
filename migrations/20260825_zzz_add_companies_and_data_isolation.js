'use strict';

const { randomUUID } = require('node:crypto');

const companyPermissions = [
  ['companies.read', 'Consulter le référentiel des sociétés.'],
  ['companies.create', 'Créer de nouvelles sociétés.'],
  ['companies.update', 'Modifier les informations générales des sociétés.'],
  ['companies.status.update', 'Activer ou désactiver des sociétés.'],
  ['companies.delete', 'Supprimer des sociétés vides.'],
  [
    'companies.access.all',
    'Accéder aux données de toutes les sociétés sans restriction d’appartenance.',
  ],
  ['users.companies.update', 'Modifier les sociétés attribuées à un utilisateur.'],
];

const tenantTables = [
  'categories',
  'part_manufacturers',
  'suppliers',
  'materials',
  'material_files',
  'maintenance_operations',
  'maintenance_parts',
  'maintenance_tasks',
  'maintenance_task_parts',
  'maintenance_history',
  'maintenance_interventions',
  'maintenance_part_usages',
  'maintenance_part_price_history',
  'inventory_stock_movements',
];

const scopedUniqueIndexes = [
  ['categories', 'name', 'uq_categories_company_name', ['company_id', 'name']],
  ['part_manufacturers', 'name', 'uq_manufacturers_company_name', ['company_id', 'name']],
  ['suppliers', 'name', 'uq_suppliers_company_name', ['company_id', 'name']],
  ['materials', 'name', 'uq_materials_company_name', ['company_id', 'name']],
  [
    'materials',
    'serial_number',
    'uq_materials_company_serial_number',
    ['company_id', 'serial_number'],
  ],
  [
    'maintenance_operations',
    'name',
    'uq_maintenance_operations_company_name',
    ['company_id', 'name'],
  ],
];

const ensurePermission = (queryInterface, name, description, timestamp) =>
  queryInterface.sequelize.query(
    `INSERT INTO permissions (uuid, name, description, created_at, updated_at)
     VALUES (:uuid, :name, :description, :timestamp, :timestamp)
     ON DUPLICATE KEY UPDATE description = :description, deleted_at = NULL, updated_at = :timestamp`,
    { replacements: { uuid: randomUUID(), name, description, timestamp } },
  );

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamp = new Date();
    await queryInterface.createTable('companies', {
      id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.bulkInsert('companies', [
      {
        uuid: randomUUID(),
        code: 'EI_BOURNAZEL_PAUL',
        name: 'EI BOURNAZEL Paul',
        description: 'Paysagiste - Élageur - Jardinier',
        active: true,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ]);
    const [[defaultCompany]] = await queryInterface.sequelize.query(
      "SELECT id, uuid FROM companies WHERE code = 'EI_BOURNAZEL_PAUL' LIMIT 1",
    );

    await queryInterface.createTable('user_companies', {
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      company_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        references: { model: 'companies', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    for (const table of tenantTables) {
      await queryInterface.addColumn(table, 'company_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET company_id = :companyId WHERE company_id IS NULL`,
        { replacements: { companyId: defaultCompany.id } },
      );
      await queryInterface.changeColumn(table, 'company_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addIndex(table, ['company_id'], {
        name: `idx_${table}_company`,
      });
    }

    await queryInterface.addColumn('audit_logs', 'company_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: 'companies', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
    await queryInterface.sequelize.query(
      `UPDATE audit_logs
       SET company_id = :companyId
       WHERE entity NOT IN ('ROLE', 'PERMISSION', 'COMPANY')`,
      { replacements: { companyId: defaultCompany.id } },
    );
    await queryInterface.addIndex('audit_logs', ['company_id', 'created_at'], {
      name: 'idx_audit_logs_company_created_at',
    });

    for (const [table, oldIndex, newIndex, fields] of scopedUniqueIndexes) {
      await queryInterface.removeIndex(table, oldIndex);
      await queryInterface.addIndex(table, fields, { name: newIndex, unique: true });
    }
    await queryInterface.removeIndex(
      'maintenance_parts',
      'uq_maintenance_part_manufacturer_reference',
    );
    await queryInterface.addIndex(
      'maintenance_parts',
      ['company_id', 'manufacturer', 'reference'],
      { name: 'uq_maintenance_parts_company_manufacturer_reference', unique: true },
    );

    for (const [name, description] of companyPermissions) {
      await ensurePermission(queryInterface, name, description, timestamp);
    }
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
       SELECT :timestamp, :timestamp, roles.id, permissions.id
       FROM roles
       CROSS JOIN permissions
       WHERE roles.name = 'ADMIN'
         AND roles.deleted_at IS NULL
         AND permissions.name IN (:permissionNames)
         AND permissions.deleted_at IS NULL`,
      {
        replacements: {
          timestamp,
          permissionNames: companyPermissions.map(([name]) => name),
        },
      },
    );
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO user_companies (user_id, company_id, created_at, updated_at)
       SELECT users.id, :companyId, :timestamp, :timestamp
       FROM users
       WHERE NOT EXISTS (
           SELECT 1
           FROM user_roles
           INNER JOIN roles ON roles.id = user_roles.role_id
           WHERE user_roles.user_id = users.id
             AND roles.name = 'ADMIN'
             AND roles.deleted_at IS NULL
         )`,
      { replacements: { companyId: defaultCompany.id, timestamp } },
    );
    await queryInterface.sequelize.query(
      'UPDATE users SET authorization_version = authorization_version + 1',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'UPDATE users SET authorization_version = authorization_version + 1',
    );
    await queryInterface.sequelize.query(
      `DELETE grants FROM role_permissions AS grants
       INNER JOIN permissions ON permissions.id = grants.permission_id
       WHERE permissions.name IN (:permissionNames)`,
      { replacements: { permissionNames: companyPermissions.map(([name]) => name) } },
    );
    await queryInterface.sequelize.query(
      'DELETE FROM permissions WHERE name IN (:permissionNames)',
      { replacements: { permissionNames: companyPermissions.map(([name]) => name) } },
    );

    await queryInterface.removeIndex(
      'maintenance_parts',
      'uq_maintenance_parts_company_manufacturer_reference',
    );
    await queryInterface.addIndex('maintenance_parts', ['manufacturer', 'reference'], {
      name: 'uq_maintenance_part_manufacturer_reference',
      unique: true,
    });
    for (const [table, oldIndex, newIndex] of [...scopedUniqueIndexes].reverse()) {
      await queryInterface.removeIndex(table, newIndex);
      await queryInterface.addIndex(table, [oldIndex], { name: oldIndex, unique: true });
    }

    await queryInterface.removeIndex('audit_logs', 'idx_audit_logs_company_created_at');
    await queryInterface.removeColumn('audit_logs', 'company_id');
    for (const table of [...tenantTables].reverse()) {
      await queryInterface.removeIndex(table, `idx_${table}_company`);
      await queryInterface.removeColumn(table, 'company_id');
    }
    await queryInterface.dropTable('user_companies');
    await queryInterface.dropTable('companies');
  },
};
