const normalizeType = (value) =>
  String(value)
    .toUpperCase()
    .replace(/ BINARY/g, '')
    .replace(/TINYINT\(1\)/g, 'BOOLEAN')
    .replace(/INTEGER/g, 'INT')
    .replace(/\b(INT|BIGINT)\(\d+\)/g, '$1')
    .replace(/, /g, ',');
const indexFields = (index) =>
  index.fields.map((field) => (typeof field === 'string' ? field : field.attribute));

/** Read-only contract check: model columns, nullability, SQL defaults, keys and references. */
export async function findSchemaIssues(sequelize) {
  const qi = sequelize.getQueryInterface();
  const tables = new Set(
    (await qi.showAllTables()).map((table) =>
      typeof table === 'string' ? table : table.tableName,
    ),
  );
  const issues = [];
  for (const model of Object.values(sequelize.models)) {
    const table = model.getTableName();
    if (!tables.has(table)) {
      issues.push(`${table} : table absente`);
      continue;
    }
    const columns = await qi.describeTable(table);
    const indexes = await qi.showIndex(table);
    const references = await qi.getForeignKeyReferencesForTable(table);
    const byField = new Map();
    for (const attribute of Object.values(model.getAttributes()).filter(
      (item) => item.type.key !== 'VIRTUAL',
    )) {
      const previous = byField.get(attribute.field);
      byField.set(attribute.field, {
        ...previous,
        ...attribute,
        allowNull:
          previous?.allowNull === false || attribute.allowNull === false
            ? false
            : attribute.allowNull,
      });
    }
    const attributes = [...byField.values()];
    for (const attribute of attributes) {
      const column = columns[attribute.field];
      const name = `${table}.${attribute.field}`;
      if (!column) {
        issues.push(`${name} : colonne absente`);
        continue;
      }
      const expectedType = attribute.type.toSql({ escape: (value) => sequelize.escape(value) });
      if (normalizeType(expectedType) !== normalizeType(column.type))
        issues.push(`${name} : type ${column.type}, attendu ${expectedType}`);
      if (!attribute.primaryKey && column.allowNull !== (attribute.allowNull !== false))
        issues.push(`${name} : nullabilité différente`);
      const expectedDefault = attribute.defaultValue;
      const numeric = ['DECIMAL', 'INTEGER', 'BIGINT', 'FLOAT', 'DOUBLE', 'BOOLEAN'].includes(
        attribute.type.key,
      );
      if (
        ['string', 'number', 'boolean'].includes(typeof expectedDefault) &&
        (column.defaultValue === null ||
          (numeric
            ? Number(expectedDefault) !== Number(column.defaultValue)
            : String(expectedDefault) !== String(column.defaultValue)))
      ) {
        issues.push(`${name} : valeur par défaut différente`);
      }
      if (
        attribute.unique === true &&
        !indexes.some(
          (index) =>
            index.unique && index.fields.length === 1 && indexFields(index)[0] === attribute.field,
        )
      ) {
        issues.push(`${name} : unicité absente`);
      }
      if (
        attribute.references &&
        !references.some(
          (reference) =>
            reference.columnName === attribute.field &&
            reference.referencedTableName === attribute.references.model &&
            reference.referencedColumnName === attribute.references.key,
        )
      )
        issues.push(`${name} : référence absente`);
    }
    const primary = attributes
      .filter((attribute) => attribute.primaryKey)
      .map((attribute) => attribute.field)
      .sort();
    const actualPrimary = indexes.find((index) => index.primary);
    if (primary.join(',') !== (actualPrimary ? indexFields(actualPrimary).sort().join(',') : ''))
      issues.push(`${table} : clé primaire différente`);
    for (const expected of model.options.indexes ?? []) {
      const fields = indexFields(expected);
      if (
        !indexes.some(
          (index) =>
            Boolean(index.unique) === Boolean(expected.unique) &&
            indexFields(index).join(',') === fields.join(','),
        )
      ) {
        issues.push(`${table} : index (${fields.join(', ')}) absent`);
      }
    }
  }
  return issues;
}

export async function assertSchemaCompatible(sequelize) {
  const issues = await findSchemaIssues(sequelize);
  if (issues.length)
    throw new Error(`Schéma incompatible avec les modèles :\n${issues.join('\n')}`);
}
