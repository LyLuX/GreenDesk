import { jest } from '@jest/globals';

import migration from '../migrations/20260823_zz_add_material_document_types.js';

describe('material document types migration', () => {
  const Sequelize = { ENUM: jest.fn((...values) => ({ values })) };
  const currentValues = [
    'invoice',
    'manual',
    'certificate',
    'exploded_view',
    'parts_list',
    'other',
  ];

  beforeEach(() => Sequelize.ENUM.mockClear());

  it('adds the two document classifications', async () => {
    const queryInterface = { changeColumn: jest.fn().mockResolvedValue(undefined) };

    await migration.up(queryInterface, Sequelize);

    expect(Sequelize.ENUM).toHaveBeenCalledWith(...currentValues);
    expect(queryInterface.changeColumn).toHaveBeenCalledWith('material_files', 'document_type', {
      type: { values: currentValues },
      allowNull: true,
    });
  });

  it('preserves documents as other before narrowing the enum on rollback', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryInterface = {
      sequelize: { query },
      changeColumn: jest.fn().mockResolvedValue(undefined),
    };

    await migration.down(queryInterface, Sequelize);

    expect(query).toHaveBeenCalledWith(expect.stringContaining("document_type = 'other'"));
    expect(queryInterface.changeColumn).toHaveBeenCalledWith('material_files', 'document_type', {
      type: { values: ['invoice', 'manual', 'certificate', 'other'] },
      allowNull: true,
    });
  });
});
