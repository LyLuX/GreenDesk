import { describe, expect, it, jest } from '@jest/globals';

import RelationsService from '../src/modules/relations/service/relations.service.js';
import RecordRelationsService from '../src/modules/relations/service/record-relations.service.js';

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

describe('RecordRelationsService', () => {
  it('links actual materials, plans and required parts with their persisted identifiers', async () => {
    const dataSource = {
      getCompany: jest.fn().mockResolvedValue({ uuid: 'company-uuid', name: 'Alpha' }),
      getRecords: jest.fn().mockResolvedValue({
        materials: [
          {
            id: 10,
            uuid: 'material-uuid',
            name: 'Compresseur A',
            model: 'CX-1',
            categoryId: null,
            manufacturerId: null,
          },
        ],
        plans: [
          {
            id: 20,
            uuid: 'plan-uuid',
            title: 'Vidange annuelle',
            maintenanceType: 'preventive',
            materialId: 10,
            operationId: null,
          },
        ],
        parts: [
          {
            id: 30,
            uuid: 'part-uuid',
            name: 'Filtre à huile',
            reference: 'FH-01',
            unit: 'pièce',
            manufacturerId: null,
            supplierId: null,
          },
        ],
        taskParts: [{ maintenanceTaskId: 20, maintenancePartId: 30, quantity: '2.00' }],
      }),
    };

    const result = await new RecordRelationsService(dataSource).getGraph({
      mode: 'simplified',
      permissions: ['materials.read', 'maintenance.read', 'maintenance.parts.read'],
    });

    expect(result).toEqual(expect.objectContaining({ scope: 'records', mode: 'simplified' }));
    expect(result.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'material:material-uuid', label: 'Compresseur A' }),
        expect.objectContaining({ id: 'plan:plan-uuid', label: 'Vidange annuelle' }),
        expect.objectContaining({ id: 'part:part-uuid', label: 'Filtre à huile' }),
      ]),
    );
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'material:material-uuid',
          target: 'plan:plan-uuid',
          label: 'possède',
        }),
        expect.objectContaining({
          source: 'plan:plan-uuid',
          target: 'part:part-uuid',
          label: 'prévoit 2 pièces',
        }),
      ]),
    );
    expect(dataSource.getRecords).toHaveBeenCalledWith(
      expect.arrayContaining(['materials', 'plans', 'parts', 'taskParts']),
      { visibleRoleNames: [] },
    );
  });

  it('uses the record scope through the public relations service', async () => {
    const modelRepository = repository();
    const recordService = { getGraph: jest.fn().mockResolvedValue({ scope: 'records' }) };
    const service = new RelationsService(modelRepository, recordService);

    await service.getGraph({ scope: 'records', mode: 'complete', permissions: ['relations.read'] });

    expect(recordService.getGraph).toHaveBeenCalledWith({
      mode: 'complete',
      permissions: ['relations.read'],
    });
    expect(modelRepository.getCompany).not.toHaveBeenCalled();
  });
});
