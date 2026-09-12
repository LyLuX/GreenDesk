import { jest } from '@jest/globals';
import baseline from '../migrations/20260723_initial_schema.js';
import completion from '../migrations/20260912_complete_migrated_schema.js';

test('refuses to adopt existing data without migration history', async () => {
  const qi = {
    showAllTables: async () => ['SequelizeMeta', 'users'],
    sequelize: { query: async () => [[]] },
    createTable: jest.fn(),
  };
  await expect(baseline.up(qi, {})).rejects.toThrow('sans historique');
  expect(qi.createTable).not.toHaveBeenCalled();
});

test('refuses an incomplete historical database before creating tables', async () => {
  const qi = {
    showAllTables: async () => ['SequelizeMeta', 'unrelated'],
    sequelize: { query: async () => [[{ name: '20260724_add_brand_logos.js' }]] },
    createTable: jest.fn(),
  };
  await expect(baseline.up(qi, {})).rejects.toThrow('table users absente');
  expect(qi.createTable).not.toHaveBeenCalled();
});

test('refuses orphaned verification tokens instead of deleting data', async () => {
  const qi = {
    describeTable: async () => ({ deleted_at: {} }),
    getForeignKeyReferencesForTable: async () => [],
    sequelize: { query: jest.fn(async () => [[{ count: 1 }]]) },
    addConstraint: jest.fn(),
  };
  await expect(completion.up(qi, {})).rejects.toThrow('orphelins');
  expect(qi.addConstraint).not.toHaveBeenCalled();
  expect(qi.sequelize.query).toHaveBeenCalledTimes(1);
  expect(qi.sequelize.query.mock.calls[0][0]).toMatch(/^SELECT/);
});
