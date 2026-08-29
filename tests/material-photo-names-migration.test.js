import { jest } from '@jest/globals';

import migration from '../migrations/20260829_add_material_photo_names.js';

describe('material photo names migration', () => {
  it('adds an optional name without altering existing material files', async () => {
    const Sequelize = { STRING: jest.fn((length) => ({ type: 'STRING', length })) };
    const queryInterface = { addColumn: jest.fn().mockResolvedValue(undefined) };

    await migration.up(queryInterface, Sequelize);

    expect(Sequelize.STRING).toHaveBeenCalledWith(150);
    expect(queryInterface.addColumn).toHaveBeenCalledWith('material_files', 'name', {
      type: { type: 'STRING', length: 150 },
      allowNull: true,
    });
  });

  it('removes the photo name on rollback', async () => {
    const queryInterface = { removeColumn: jest.fn().mockResolvedValue(undefined) };

    await migration.down(queryInterface);

    expect(queryInterface.removeColumn).toHaveBeenCalledWith('material_files', 'name');
  });
});
