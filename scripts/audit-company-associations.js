import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { QueryTypes } from 'sequelize';

import sequelize from '../src/config/database.js';

const auditSubjects = Object.freeze({
  MATERIAL: 'materials',
  CATEGORY: 'categories',
  MANUFACTURER: 'part_manufacturers',
  SUPPLIER: 'suppliers',
  MAINTENANCE_TASK: 'maintenance_tasks',
  MAINTENANCE_OPERATION: 'maintenance_operations',
  MAINTENANCE_PART: 'maintenance_parts',
});

const expectedRelations = Object.freeze([
  ['maintenance_history', 'maintenance_task_id', 'maintenance_tasks'],
  ['maintenance_interventions', 'material_id', 'materials'],
  ['maintenance_part_price_history', 'maintenance_part_id', 'maintenance_parts'],
  ['maintenance_part_usages', 'maintenance_history_id', 'maintenance_history'],
  ['maintenance_part_usages', 'maintenance_intervention_id', 'maintenance_interventions'],
  ['maintenance_part_usages', 'maintenance_part_id', 'maintenance_parts'],
  ['maintenance_parts', 'manufacturer_id', 'part_manufacturers'],
  ['maintenance_parts', 'supplier_id', 'suppliers'],
  ['maintenance_task_parts', 'maintenance_part_id', 'maintenance_parts'],
  ['maintenance_task_parts', 'maintenance_task_id', 'maintenance_tasks'],
  ['maintenance_tasks', 'material_id', 'materials'],
  ['maintenance_tasks', 'operation_id', 'maintenance_operations'],
  ['material_files', 'material_id', 'materials'],
  ['materials', 'category_id', 'categories'],
  ['materials', 'manufacturer_id', 'part_manufacturers'],
]);

const asCount = (rows) => Number(rows[0]?.count ?? 0);

/** Read-only inventory of tenant-owned foreign keys and cross-company references. */
export async function auditCompanyAssociations(database = sequelize) {
  const [{ name: databaseName }] = await database.query('SELECT DATABASE() AS name', {
    type: QueryTypes.SELECT,
  });
  if (!databaseName) throw new Error('Aucune base MySQL sélectionnée.');

  const columns = await database.query(
    `SELECT TABLE_NAME AS tableName
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = $databaseName AND COLUMN_NAME = 'company_id'`,
    { bind: { databaseName }, type: QueryTypes.SELECT },
  );
  const tenantTables = new Set(columns.map(({ tableName }) => tableName));
  const foreignKeys = await database.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName,
            REFERENCED_TABLE_NAME AS parentTable, REFERENCED_COLUMN_NAME AS parentColumn,
            CONSTRAINT_NAME AS constraintName
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = $databaseName AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { bind: { databaseName }, type: QueryTypes.SELECT },
  );
  const quote = (identifier) =>
    database.getQueryInterface().queryGenerator.quoteIdentifier(identifier);
  const relations = [];
  for (const key of foreignKeys) {
    if (
      key.parentColumn !== 'id' ||
      !tenantTables.has(key.tableName) ||
      !tenantTables.has(key.parentTable)
    ) {
      continue;
    }
    const constraint = foreignKeys.filter(
      (part) => part.tableName === key.tableName && part.constraintName === key.constraintName,
    );
    const companyEnforced = constraint.some(
      (part) => part.columnName === 'company_id' && part.parentColumn === 'company_id',
    );
    const rows = await database.query(
      `SELECT COUNT(*) AS count
       FROM ${quote(key.tableName)} child
       JOIN ${quote(key.parentTable)} parent ON parent.id = child.${quote(key.columnName)}
       WHERE child.company_id <> parent.company_id`,
      { type: QueryTypes.SELECT },
    );
    relations.push({
      child: key.tableName,
      column: key.columnName,
      parent: key.parentTable,
      companyEnforced,
      mismatches: asCount(rows),
    });
  }
  relations.sort((left, right) =>
    `${left.child}.${left.column}`.localeCompare(`${right.child}.${right.column}`),
  );
  const missingForeignKeys = expectedRelations
    .filter(
      ([child, column, parent]) =>
        !relations.some(
          (relation) =>
            relation.child === child && relation.column === column && relation.parent === parent,
        ),
    )
    .map(([child, column, parent]) => ({ child, column, parent }));

  const stock = await database.query(
    `SELECT COUNT(*) AS count
     FROM inventory_stock_movements movement
     JOIN maintenance_parts part ON part.id = movement.stockable_id
     WHERE movement.stockable_type = 'maintenancePart'
       AND movement.company_id <> part.company_id`,
    { type: QueryTypes.SELECT },
  );
  const audit = [];
  for (const [entity, table] of Object.entries(auditSubjects)) {
    const rows = await database.query(
      `SELECT COUNT(*) AS count
       FROM audit_logs event
       JOIN ${quote(table)} subject ON subject.uuid = event.entity_uuid
       WHERE event.entity = $entity AND event.company_id IS NOT NULL
         AND event.company_id <> subject.company_id`,
      { bind: { entity }, type: QueryTypes.SELECT },
    );
    audit.push({ entity, subjectTable: table, mismatches: asCount(rows) });
  }
  const mismatches =
    relations.reduce((sum, relation) => sum + relation.mismatches, 0) +
    asCount(stock) +
    audit.reduce((sum, subject) => sum + subject.mismatches, 0);
  return {
    database: databaseName,
    checkedAt: new Date().toISOString(),
    relations,
    missingForeignKeys,
    stockMovements: { type: 'maintenancePart', mismatches: asCount(stock) },
    auditSubjects: audit,
    mismatches,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const report = await auditCompanyAssociations();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.mismatches || report.missingForeignKeys.length) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`Audit des associations impossible : ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
