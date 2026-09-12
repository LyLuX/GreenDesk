import { readdir } from 'node:fs/promises';
import { jest } from '@jest/globals';
import { assertMigrationsCurrent } from '../src/core/database/migration-check.js';

const names = (await readdir(new URL('../migrations/', import.meta.url))).filter((name) =>
  name.endsWith('.js'),
);
function database(applied, tables = ['SequelizeMeta']) {
  return {
    getQueryInterface: () => ({
      showAllTables: async () => tables,
      queryGenerator: { quoteTable: (table) => `\`${table}\`` },
    }),
    query: jest.fn(async () => [applied.map((name) => ({ name }))]),
  };
}

test('accepts a fully migrated database, including lowercase MySQL metadata', async () => {
  await expect(
    assertMigrationsCurrent(database(names, ['sequelizemeta'])),
  ).resolves.toBeUndefined();
});
test('blocks startup when any migration is pending', async () => {
  await expect(assertMigrationsCurrent(database(names.slice(1)))).rejects.toThrow(
    'npm run db:migrate',
  );
});
test('blocks an empty database without querying a nonexistent history table', async () => {
  const db = database([], []);
  await expect(assertMigrationsCurrent(db)).rejects.toThrow('npm run db:migrate');
  expect(db.query).not.toHaveBeenCalled();
});
test('rejects history belonging to an unknown application version', async () => {
  await expect(assertMigrationsCurrent(database([...names, '20990101_future.js']))).rejects.toThrow(
    'Historique SQL inconnu',
  );
});
