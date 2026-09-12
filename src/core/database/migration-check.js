import { readdir } from 'node:fs/promises';

const migrationDirectory = new URL('../../../migrations/', import.meta.url);

/** Startup only reads migration history; schema changes remain an explicit operation. */
export async function assertMigrationsCurrent(sequelize, directory = migrationDirectory) {
  const expected = (await readdir(directory)).filter((name) => name.endsWith('.js')).sort();
  const tables = await sequelize.getQueryInterface().showAllTables();
  const metadata = tables.find(
    (table) => typeof table === 'string' && table.toLowerCase() === 'sequelizemeta',
  );
  const applied = metadata
    ? (
        await sequelize.query(
          `SELECT name FROM ${sequelize.getQueryInterface().queryGenerator.quoteTable(metadata)}`,
        )
      )[0].map((row) => row.name)
    : [];
  const pending = expected.filter((name) => !applied.includes(name));
  const unknown = applied.filter((name) => !expected.includes(name));
  if (unknown.length)
    throw new Error(`Historique SQL inconnu de cette version : ${unknown.join(', ')}`);
  if (pending.length)
    throw new Error(
      `Migrations SQL en attente : ${pending.join(', ')}. Exécutez npm run db:migrate avant de démarrer GreenDesk.`,
    );
}
