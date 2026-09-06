import { jest } from '@jest/globals';
import migration from '../migrations/20260906_clarify_maintenance_execute_permission.js';
import permissionDefinitions from '../src/core/constants/permission-definitions.js';

describe('maintenance execution permission description migration', () => {
  it('updates only the existing description with the canonical wording', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.up({ sequelize: { query } });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      'UPDATE permissions SET description = $description, updated_at = $timestamp WHERE name = $name',
      {
        bind: {
          name: 'maintenance.execute',
          description: permissionDefinitions.find(({ name }) => name === 'maintenance.execute')
            .description,
          timestamp: expect.any(Date),
        },
      },
    );
  });

  it('restores the former description on rollback', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration.down({ sequelize: { query } });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      'UPDATE permissions SET description = $description, updated_at = $timestamp WHERE name = $name',
      {
        bind: {
          name: 'maintenance.execute',
          description: 'Enregistrer un entretien réalisé et recalculer ses prochaines échéances.',
          timestamp: expect.any(Date),
        },
      },
    );
  });
});
