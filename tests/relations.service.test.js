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
  it('groups fleet resources between the fleet branch and their records', async () => {
    const dataSource = {
      getCompany: jest.fn().mockResolvedValue({ uuid: 'company-uuid', name: 'Alpha' }),
      getRecords: jest.fn().mockResolvedValue({
        materials: [
          {
            id: 4,
            uuid: 'material-uuid',
            name: 'Tondeuse',
            categoryId: 1,
            manufacturerId: 2,
          },
        ],
        categories: [{ id: 1, uuid: 'category-uuid', name: 'Espaces verts' }],
        manufacturers: [{ id: 2, uuid: 'manufacturer-uuid', name: 'Husqvarna' }],
        suppliers: [{ id: 3, uuid: 'supplier-uuid', name: 'Pièces Pro' }],
      }),
    };

    const result = await new RecordRelationsService(dataSource).getGraph({
      permissions: ['materials.read', 'categories.read', 'manufacturers.read', 'suppliers.read'],
    });

    expect(result.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'materials', label: 'Matériels', kind: 'domain', count: 1 }),
        expect.objectContaining({
          id: 'categories',
          label: 'Catégories',
          kind: 'domain',
          count: 1,
        }),
        expect.objectContaining({
          id: 'manufacturers',
          label: 'Fabricants',
          kind: 'domain',
          count: 1,
        }),
        expect.objectContaining({
          id: 'suppliers',
          label: 'Fournisseurs',
          kind: 'domain',
          count: 1,
        }),
      ]),
    );
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'fleet', target: 'materials', hierarchy: true }),
        expect.objectContaining({
          source: 'materials',
          target: 'material:material-uuid',
          hierarchy: true,
        }),
        expect.objectContaining({ source: 'fleet', target: 'categories', hierarchy: true }),
        expect.objectContaining({
          source: 'categories',
          target: 'category:category-uuid',
          hierarchy: true,
        }),
        expect.objectContaining({
          source: 'category:category-uuid',
          target: 'material:material-uuid',
          hierarchy: true,
        }),
        expect.objectContaining({ source: 'fleet', target: 'manufacturers', hierarchy: true }),
        expect.objectContaining({
          source: 'manufacturers',
          target: 'manufacturer:manufacturer-uuid',
          hierarchy: true,
        }),
        expect.objectContaining({
          source: 'manufacturer:manufacturer-uuid',
          target: 'material:material-uuid',
          hierarchy: true,
        }),
        expect.objectContaining({ source: 'fleet', target: 'suppliers', hierarchy: true }),
        expect.objectContaining({
          source: 'suppliers',
          target: 'supplier:supplier-uuid',
          hierarchy: true,
        }),
      ]),
    );
    expect(result.edges).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'fleet', target: 'material:material-uuid' }),
      ]),
    );
  });

  it('keeps material files below their material in complete mode', async () => {
    const dataSource = {
      getCompany: jest.fn().mockResolvedValue({ uuid: 'company-uuid', name: 'Alpha' }),
      getRecords: jest.fn().mockResolvedValue({
        materials: [{ id: 10, uuid: 'material-uuid', name: 'Compresseur A' }],
        materialFiles: [
          {
            id: 40,
            uuid: 'file-uuid',
            originalName: 'notice.pdf',
            kind: 'document',
            materialId: 10,
          },
        ],
      }),
    };

    const result = await new RecordRelationsService(dataSource).getGraph({
      mode: 'complete',
      permissions: ['materials.read'],
    });

    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'fleet', target: 'materials', hierarchy: true }),
        expect.objectContaining({
          source: 'materials',
          target: 'material:material-uuid',
          hierarchy: true,
        }),
        expect.objectContaining({
          source: 'material:material-uuid',
          target: 'materialFile:file-uuid',
          hierarchy: true,
        }),
      ]),
    );
    expect(result.edges).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'fleet', target: 'material:material-uuid' }),
        expect.objectContaining({ source: 'fleet', target: 'materialFile:file-uuid' }),
      ]),
    );
  });

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
        operations: [
          {
            id: 15,
            uuid: 'operation-uuid',
            name: 'Vidange',
            maintenanceType: 'preventive',
          },
        ],
        plans: [
          {
            id: 20,
            uuid: 'plan-uuid',
            title: 'Vidange annuelle',
            maintenanceType: 'preventive',
            materialId: 10,
            operationId: 15,
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
      permissions: [
        'materials.read',
        'maintenance.read',
        'maintenance.operations.read',
        'maintenance.parts.read',
      ],
    });

    expect(result).toEqual(expect.objectContaining({ scope: 'records', mode: 'simplified' }));
    expect(result.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'material:material-uuid', label: 'Compresseur A' }),
        expect.objectContaining({ id: 'plans', label: 'Plans de maintenance', kind: 'domain' }),
        expect.objectContaining({ id: 'operations', label: 'Opérations', kind: 'domain' }),
        expect.objectContaining({ id: 'parts', label: 'Pièces', kind: 'domain' }),
        expect.objectContaining({ id: 'operation:operation-uuid', label: 'Vidange' }),
        expect.objectContaining({ id: 'plan:plan-uuid', label: 'Vidange annuelle' }),
        expect.objectContaining({ id: 'part:part-uuid', label: 'Filtre à huile' }),
      ]),
    );
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'maintenance', target: 'plans', hierarchy: true }),
        expect.objectContaining({ source: 'maintenance', target: 'operations', hierarchy: true }),
        expect.objectContaining({ source: 'maintenance', target: 'parts', hierarchy: true }),
        expect.objectContaining({
          source: 'plans',
          target: 'plan:plan-uuid',
          hierarchy: true,
        }),
        expect.objectContaining({
          source: 'operations',
          target: 'operation:operation-uuid',
          hierarchy: true,
        }),
        expect.objectContaining({
          source: 'parts',
          target: 'part:part-uuid',
          hierarchy: true,
        }),
        expect.objectContaining({
          source: 'operation:operation-uuid',
          target: 'plan:plan-uuid',
          hierarchy: true,
        }),
        expect.objectContaining({
          source: 'material:material-uuid',
          target: 'plan:plan-uuid',
          label: '',
        }),
        expect.objectContaining({
          source: 'plan:plan-uuid',
          target: 'part:part-uuid',
          label: '',
          hierarchy: true,
        }),
      ]),
    );
    expect(result.edges).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'maintenance', target: 'plan:plan-uuid' }),
        expect.objectContaining({ source: 'maintenance', target: 'operation:operation-uuid' }),
        expect.objectContaining({ source: 'maintenance', target: 'part:part-uuid' }),
      ]),
    );
    expect(dataSource.getRecords).toHaveBeenCalledWith(
      expect.arrayContaining(['materials', 'plans', 'operations', 'parts', 'taskParts']),
    );
    expect(dataSource.getRecords.mock.calls[0][0]).toEqual(
      expect.not.arrayContaining([
        'users',
        'roles',
        'permissions',
        'planExecutions',
        'interventions',
        'partUsages',
        'priceHistory',
        'stockMovements',
        'auditLogs',
      ]),
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
