import { jest } from '@jest/globals';

import migration from '../migrations/20260829_zz_update_skip_parts_permission_description.js';

describe('partial maintenance permission description migration', () => {
  it('clarifies the existing permission without creating another one', async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await migration.up({ sequelize: { query } });

    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE permissions'), {
      replacements: expect.objectContaining({
        name: 'maintenance.execute.skip_parts',
        description: expect.stringContaining('tout ou partie'),
      }),
    });
  });

  it('restores the previous description on rollback', async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await migration.down({ sequelize: { query } });

    expect(query.mock.calls[0][1].replacements.description).toBe(
      'Enregistrer exceptionnellement un entretien sans remplacer les pièces prévues.',
    );
  });
});
