import { jest } from '@jest/globals';

import migration from '../migrations/20260902_add_company_logos.js';

describe('company logo migration', () => {
  it('adds protected logo metadata and the dedicated permission', async () => {
    const queryInterface = {
      addColumn: jest.fn(),
      sequelize: { query: jest.fn() },
    };
    const Sequelize = { STRING: jest.fn((length) => `STRING(${length})`) };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn.mock.calls.map((call) => call[1])).toEqual([
      'logo_file_name',
      'logo_original_name',
      'logo_mime_type',
    ]);
    expect(queryInterface.sequelize.query.mock.calls[0][1].replacements).toEqual(
      expect.objectContaining({
        name: 'companies.logo.update',
        description: 'Ajouter, remplacer ou supprimer le logo d’une société.',
      }),
    );
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('source.name IN (:sourceNames)'),
      expect.objectContaining({
        replacements: expect.objectContaining({
          sourceNames: ['companies.create', 'companies.update'],
        }),
      }),
    );
  });
});
