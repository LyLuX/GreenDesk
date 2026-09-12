'use strict';

// Frozen pre-migration schema (historical models at 5e9fbdc). Never import live models here.
const schema = require('./support/initial-schema.cjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map((table) =>
      typeof table === 'string' ? table : table.tableName,
    );
    const businessTables = tables.filter((table) => table.toLowerCase() !== 'sequelizemeta');
    if (businessTables.length) {
      const [history] = await queryInterface.sequelize.query('SELECT name FROM `SequelizeMeta`');
      if (!history.length) {
        throw new Error(
          'Base non vide sans historique de migrations : adoption automatique refusée.',
        );
      }
      // The old migrations are already recorded. Do not recreate removed legacy tables (brands).
      for (const [table, columns] of Object.entries(schema.adoptionColumns)) {
        if (!tables.includes(table)) throw new Error(`Socle incomplet : table ${table} absente.`);
        const existing = await queryInterface.describeTable(table);
        for (const column of columns) {
          if (!existing[column]) throw new Error(`Socle incomplet : ${table}.${column} absent.`);
        }
      }
      return;
    }
    for (const [table, columns] of Object.entries(schema.definitions(Sequelize))) {
      await queryInterface.createTable(table, columns, { charset: 'utf8mb4', engine: 'InnoDB' });
    }
  },
  async down() {
    throw new Error(
      'Le socle initial ne peut pas être annulé : restaurez une sauvegarde pour revenir en arrière.',
    );
  },
};
