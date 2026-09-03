'use strict';

const fs = require('node:fs/promises');
const { constants: fsConstants } = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const actions = ['read', 'create', 'update', 'delete'];
const manufacturerPermissions = {
  read: 'Consulter les fabricants, leurs informations et leurs logos.',
  create: 'Ajouter de nouveaux fabricants au référentiel.',
  update: 'Modifier les fabricants et leurs logos.',
  delete: 'Supprimer des fabricants inutilisés.',
};
const supplierPermissions = {
  read: 'Consulter les fournisseurs.',
  create: 'Ajouter de nouveaux fournisseurs.',
  update: 'Modifier les fournisseurs.',
  delete: 'Supprimer des fournisseurs inutilisés.',
};

const names = (prefix) => actions.map((action) => `${prefix}.${action}`);

const copyDirectoryFiles = async (source, target) => {
  await fs.mkdir(target, { recursive: true });
  let entries;
  try {
    entries = await fs.readdir(source, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries.filter((item) => item.isFile())) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    try {
      await fs.copyFile(sourcePath, targetPath, fsConstants.COPYFILE_EXCL);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
};

const ensurePermissions = async (queryInterface, prefix, descriptions) => {
  const timestamp = new Date();
  const permissionNames = names(prefix);
  const permissionNameBinds = Object.fromEntries(
    permissionNames.map((value, index) => [`permissionName${index}`, value]),
  );
  const permissionNamePlaceholders = Object.keys(permissionNameBinds)
    .map((key) => `$${key}`)
    .join(', ');
  const [existing] = await queryInterface.sequelize.query(
    `SELECT name FROM permissions WHERE name IN (${permissionNamePlaceholders}) AND deleted_at IS NULL`,
    { bind: permissionNameBinds },
  );
  const existingNames = new Set(existing.map(({ name }) => name));
  const rows = actions
    .filter((action) => !existingNames.has(`${prefix}.${action}`))
    .map((action) => ({
      uuid: randomUUID(),
      name: `${prefix}.${action}`,
      description: descriptions[action],
      created_at: timestamp,
      updated_at: timestamp,
    }));
  if (rows.length) await queryInterface.bulkInsert('permissions', rows);
};

const copyPermissionGrants = async (queryInterface, sourcePrefixes, targetPrefix) => {
  const timestamp = new Date();
  for (const action of actions) {
    const sourceNames = sourcePrefixes.map((prefix) => `${prefix}.${action}`);
    const sourceNameBinds = Object.fromEntries(
      sourceNames.map((value, index) => [`sourceName${index}`, value]),
    );
    const sourceNamePlaceholders = Object.keys(sourceNameBinds)
      .map((key) => `$${key}`)
      .join(', ');
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO role_permissions (created_at, updated_at, role_id, permission_id)
       SELECT $timestamp, $timestamp, grants.role_id, target.id
       FROM role_permissions AS grants
       INNER JOIN permissions AS source ON source.id = grants.permission_id
       INNER JOIN permissions AS target ON target.name = $targetName
       WHERE source.name IN (${sourceNamePlaceholders})
         AND source.deleted_at IS NULL
         AND target.deleted_at IS NULL`,
      {
        bind: {
          timestamp,
          targetName: `${targetPrefix}.${action}`,
          ...sourceNameBinds,
        },
      },
    );
  }
};

const removePermissions = async (queryInterface, prefixes) => {
  const permissionNames = prefixes.flatMap(names);
  const permissionNameBinds = Object.fromEntries(
    permissionNames.map((value, index) => [`permissionName${index}`, value]),
  );
  const permissionNamePlaceholders = Object.keys(permissionNameBinds)
    .map((key) => `$${key}`)
    .join(', ');
  await queryInterface.sequelize.query(
    `DELETE grants
     FROM role_permissions AS grants
     INNER JOIN permissions ON permissions.id = grants.permission_id
     WHERE permissions.name IN (${permissionNamePlaceholders})`,
    { bind: permissionNameBinds },
  );
  await queryInterface.bulkDelete('permissions', { name: permissionNames });
};

const dropForeignKeysForColumn = async (queryInterface, table, column) => {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME AS name
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = $table
       AND COLUMN_NAME = $column
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { bind: { table, column } },
  );
  for (const constraint of constraints) {
    await queryInterface.removeConstraint(table, constraint.name);
  }
};

const brandColumns = (Sequelize) => ({
  id: {
    type: Sequelize.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
  name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
  logo_file_name: { type: Sequelize.STRING(255), allowNull: true },
  logo_original_name: { type: Sequelize.STRING(255), allowNull: true },
  logo_mime_type: { type: Sequelize.STRING(100), allowNull: true },
  active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
  created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
  updated_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
  deleted_at: { type: Sequelize.DATE, allowNull: true },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameTable('maintenance_part_manufacturers', 'part_manufacturers');
    await queryInterface.renameTable('maintenance_suppliers', 'suppliers');

    const manufacturerColumns = {
      description: { type: Sequelize.TEXT, allowNull: true },
      logo_file_name: { type: Sequelize.STRING(255), allowNull: true },
      logo_original_name: { type: Sequelize.STRING(255), allowNull: true },
      logo_mime_type: { type: Sequelize.STRING(100), allowNull: true },
    };
    for (const [column, definition] of Object.entries(manufacturerColumns)) {
      await queryInterface.addColumn('part_manufacturers', column, definition);
    }

    await dropForeignKeysForColumn(queryInterface, 'materials', 'brand_id');
    await queryInterface.renameColumn('materials', 'brand_id', 'manufacturer_id');

    const [brands] = await queryInterface.sequelize.query('SELECT * FROM brands ORDER BY id');
    for (const brand of brands) {
      const [matches] = await queryInterface.sequelize.query(
        'SELECT * FROM part_manufacturers WHERE name = $name LIMIT 1',
        { bind: { name: brand.name } },
      );
      let manufacturer = matches[0];
      if (manufacturer) {
        await queryInterface.sequelize.query(
          `UPDATE part_manufacturers
           SET logo_file_name = COALESCE(logo_file_name, $logoFileName),
               logo_original_name = COALESCE(logo_original_name, $logoOriginalName),
               logo_mime_type = COALESCE(logo_mime_type, $logoMimeType),
               active = GREATEST(active, $active),
               deleted_at = CASE WHEN $brandDeletedAt IS NULL THEN NULL ELSE deleted_at END,
               updated_at = $updatedAt
           WHERE id = $id`,
          {
            bind: {
              id: manufacturer.id,
              logoFileName: brand.logo_file_name,
              logoOriginalName: brand.logo_original_name,
              logoMimeType: brand.logo_mime_type,
              active: brand.active,
              brandDeletedAt: brand.deleted_at,
              updatedAt: brand.updated_at,
            },
          },
        );
      } else {
        await queryInterface.bulkInsert('part_manufacturers', [
          {
            uuid: brand.uuid,
            name: brand.name,
            notes: null,
            description: null,
            logo_file_name: brand.logo_file_name,
            logo_original_name: brand.logo_original_name,
            logo_mime_type: brand.logo_mime_type,
            active: brand.active,
            created_by: brand.created_by,
            updated_by: brand.updated_by,
            created_at: brand.created_at,
            updated_at: brand.updated_at,
            deleted_at: brand.deleted_at,
          },
        ]);
        const [created] = await queryInterface.sequelize.query(
          'SELECT * FROM part_manufacturers WHERE uuid = $uuid LIMIT 1',
          { bind: { uuid: brand.uuid } },
        );
        manufacturer = created[0];
      }
      await queryInterface.sequelize.query(
        `UPDATE materials
         SET manufacturer_id = $manufacturerId
         WHERE manufacturer_id = $brandId`,
        { bind: { manufacturerId: manufacturer.id, brandId: brand.id } },
      );
    }
    await queryInterface.dropTable('brands');
    await queryInterface.addConstraint('materials', {
      fields: ['manufacturer_id'],
      type: 'foreign key',
      name: 'fk_materials_manufacturer',
      references: { table: 'part_manufacturers', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await ensurePermissions(queryInterface, 'manufacturers', manufacturerPermissions);
    await ensurePermissions(queryInterface, 'suppliers', supplierPermissions);
    await copyPermissionGrants(queryInterface, ['brands', 'maintenance'], 'manufacturers');
    await copyPermissionGrants(queryInterface, ['maintenance'], 'suppliers');
    await removePermissions(queryInterface, ['brands']);

    await copyDirectoryFiles(
      path.join(process.cwd(), 'uploads', 'brands'),
      path.join(process.cwd(), 'uploads', 'manufacturers'),
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('brands', brandColumns(Sequelize));
    await dropForeignKeysForColumn(queryInterface, 'materials', 'manufacturer_id');

    const [manufacturers] = await queryInterface.sequelize.query(
      'SELECT * FROM part_manufacturers ORDER BY id',
    );
    for (const manufacturer of manufacturers) {
      await queryInterface.bulkInsert('brands', [
        {
          uuid: manufacturer.uuid,
          name: manufacturer.name,
          logo_file_name: manufacturer.logo_file_name,
          logo_original_name: manufacturer.logo_original_name,
          logo_mime_type: manufacturer.logo_mime_type,
          active: manufacturer.active,
          created_by: manufacturer.created_by,
          updated_by: manufacturer.updated_by,
          created_at: manufacturer.created_at,
          updated_at: manufacturer.updated_at,
          deleted_at: manufacturer.deleted_at,
        },
      ]);
      const [brands] = await queryInterface.sequelize.query(
        'SELECT id FROM brands WHERE uuid = $uuid LIMIT 1',
        { bind: { uuid: manufacturer.uuid } },
      );
      await queryInterface.sequelize.query(
        `UPDATE materials
         SET manufacturer_id = $brandId
         WHERE manufacturer_id = $manufacturerId`,
        {
          bind: {
            brandId: brands[0].id,
            manufacturerId: manufacturer.id,
          },
        },
      );
    }
    await queryInterface.renameColumn('materials', 'manufacturer_id', 'brand_id');
    await queryInterface.addConstraint('materials', {
      fields: ['brand_id'],
      type: 'foreign key',
      name: 'fk_materials_brand',
      references: { table: 'brands', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    for (const column of [
      'logo_mime_type',
      'logo_original_name',
      'logo_file_name',
      'description',
    ]) {
      await queryInterface.removeColumn('part_manufacturers', column);
    }
    await queryInterface.renameTable('suppliers', 'maintenance_suppliers');
    await queryInterface.renameTable('part_manufacturers', 'maintenance_part_manufacturers');

    await ensurePermissions(
      queryInterface,
      'brands',
      Object.fromEntries(
        actions.map((action) => [
          action,
          manufacturerPermissions[action].replaceAll('fabricant', 'marque'),
        ]),
      ),
    );
    await copyPermissionGrants(queryInterface, ['manufacturers'], 'brands');
    await removePermissions(queryInterface, ['manufacturers', 'suppliers']);

    await copyDirectoryFiles(
      path.join(process.cwd(), 'uploads', 'manufacturers'),
      path.join(process.cwd(), 'uploads', 'brands'),
    );
  },
};
