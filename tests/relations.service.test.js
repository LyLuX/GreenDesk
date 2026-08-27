import { describe, expect, it, jest } from '@jest/globals';

import RelationsService from '../src/modules/relations/service/relations.service.js';

const allReadablePermissions = [
  'users.read',
  'users.all.read',
  'roles.read',
  'permissions.read',
  'categories.read',
  'manufacturers.read',
  'suppliers.read',
  'materials.read',
  'maintenance.read',
  'maintenance.operations.read',
  'maintenance.parts.read',
  'history.fleet.read',
  'history.maintenance.read',
  'history.administration.read',
];

const repository = () => ({
  getCompany: jest.fn().mockResolvedValue({ uuid: 'company-uuid', name: 'Alpha' }),
  getCounts: jest
    .fn()
    .mockImplementation(async (keys) =>
      Object.fromEntries(keys.map((key, index) => [key, index + 1])),
    ),
});

describe('RelationsService', () => {
  it('returns a permission-filtered simplified business graph', async () => {
    const dataSource = repository();
    const service = new RelationsService(dataSource);

    const result = await service.getGraph({
      mode: 'simplified',
      permissions: ['materials.read', 'maintenance.read', 'maintenance.parts.read'],
    });

    expect(result.company).toEqual({ uuid: 'company-uuid', name: 'Alpha' });
    expect(result.nodes.find(({ id }) => id === 'company')).toEqual(
      expect.objectContaining({ label: 'Alpha', kind: 'company' }),
    );
    expect(result.nodes.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['company', 'fleet', 'maintenance', 'materials', 'plans', 'parts']),
    );
    expect(result.nodes.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(['users', 'materialFiles', 'taskParts', 'planExecutions']),
    );
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'materials', target: 'plans' }),
        expect.objectContaining({ source: 'materials', target: 'parts', kind: 'derived' }),
        expect.objectContaining({ source: 'plans', target: 'parts', kind: 'derived' }),
      ]),
    );
  });

  it('adds technical associations and histories in complete mode', async () => {
    const dataSource = repository();
    const service = new RelationsService(dataSource);

    const result = await service.getGraph({
      mode: 'complete',
      permissions: allReadablePermissions,
    });

    expect(result.nodes.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        'materialFiles',
        'taskParts',
        'planExecutions',
        'interventions',
        'partUsages',
        'priceHistory',
        'stockMovements',
        'fleetAudit',
        'maintenanceAudit',
        'administrationAudit',
      ]),
    );
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'plans', target: 'taskParts' }),
        expect.objectContaining({ source: 'taskParts', target: 'parts' }),
        expect.objectContaining({ source: 'interventions', target: 'partUsages' }),
      ]),
    );
    expect(dataSource.getCounts).toHaveBeenCalledWith(
      expect.arrayContaining(['users', 'partUsages', 'stockMovements']),
      { visibleRoleNames: undefined },
    );
  });

  it('does not expose technical nodes when one of their permissions is missing', async () => {
    const service = new RelationsService(repository());

    const result = await service.getGraph({
      mode: 'complete',
      permissions: ['maintenance.parts.read'],
    });

    expect(result.nodes.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['company', 'maintenance', 'parts']),
    );
    expect(result.nodes.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(['taskParts', 'partUsages', 'priceHistory', 'stockMovements']),
    );
  });
});
