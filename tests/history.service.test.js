import { jest } from '@jest/globals';

import HistoryService from '../src/modules/audit/service/history.service.js';

const auditRow = (overrides = {}) => ({
  uuid: 'audit-1',
  entity: 'MATERIAL',
  entityUuid: 'material-1',
  action: 'UPDATE',
  oldValues: { name: 'Ancien nom' },
  newValues: { name: 'Nouveau nom' },
  createdAt: '2026-08-22T09:00:00.000Z',
  user: { uuid: 'user-1', firstName: 'Ada', lastName: 'Lovelace' },
  ...overrides,
});

describe('HistoryService', () => {
  it('maps and paginates fleet audit events', async () => {
    const repository = {
      findAuditEvents: jest.fn().mockResolvedValue({ count: 1, rows: [auditRow()] }),
    };
    const service = new HistoryService(repository);

    const result = await service.list('fleet', { page: 1, limit: 5 });

    expect(repository.findAuditEvents).toHaveBeenCalledWith('fleet', { page: 1, limit: 5 }, 5);
    expect(result.items[0]).toMatchObject({
      type: 'material',
      action: 'UPDATE',
      subject: { uuid: 'material-1', label: 'Nouveau nom' },
      user: { firstName: 'Ada', lastName: 'Lovelace' },
    });
    expect(result.pagination).toEqual({ page: 1, limit: 5, total: 1, totalPages: 1 });
  });

  it.each([
    ['Matériel actuel', 'material-1', 'Matériel actuel'],
    [null, 'material-1', 'Matériel supprimé'],
  ])(
    'uses a joined business label and never exposes the entity UUID',
    async (subjectLabel, entityUuid, expectedLabel) => {
      const repository = {
        findAuditEvents: jest.fn().mockResolvedValue({
          count: 1,
          rows: [
            auditRow({
              subjectLabel,
              entityUuid,
              oldValues: null,
              newValues: null,
            }),
          ],
        }),
      };

      const result = await new HistoryService(repository).list('fleet');

      expect(result.items[0].subject.label).toBe(expectedLabel);
      expect(result.items[0].subject.label).not.toBe(entityUuid);
    },
  );

  it('globally sorts and paginates every maintenance journal', async () => {
    const repository = {
      findAuditEvents: jest.fn().mockResolvedValue({
        count: 1,
        rows: [auditRow({ entity: 'MAINTENANCE_PART', createdAt: '2026-08-20T10:00:00Z' })],
      }),
      findPlannedExecutions: jest.fn().mockResolvedValue({
        count: 1,
        rows: [
          {
            uuid: 'planned-1',
            performedAt: '2026-08-22',
            createdAt: '2026-08-22T08:00:00Z',
            executionType: 'partialPartReplacement',
            partsSnapshot: [{ name: 'Bougie', quantity: 1, consumed: false }],
            task: { uuid: 'task-1', title: 'Vidange', material: { uuid: 'm-1', name: 'Tracteur' } },
            performedByUser: null,
            partUsages: [],
          },
        ],
      }),
      findInterventions: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
      findStockMovements: jest.fn().mockResolvedValue({ count: 0, rows: [], parts: [] }),
      findPriceChanges: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    };
    const service = new HistoryService(repository);

    const result = await service.list('maintenance', { page: 1, limit: 5 });

    expect(result.items.map(({ uuid }) => uuid)).toEqual(['planned-1', 'audit-1']);
    expect(result.pagination.total).toBe(2);
    expect(result.items[0]).toMatchObject({
      type: 'planned_execution',
      action: 'EXECUTE_PARTIAL_PARTS',
      context: { label: 'Tracteur' },
      details: {
        executionType: 'partialPartReplacement',
        partsSnapshot: [{ name: 'Bougie', quantity: 1, consumed: false }],
      },
    });
  });

  it('uses the exact recording time to sort operations from the same business date', async () => {
    const repository = {
      findAuditEvents: jest.fn().mockResolvedValue({
        count: 1,
        rows: [
          auditRow({
            entity: 'MAINTENANCE_PART',
            createdAt: '2026-08-22T08:19:00.000Z',
          }),
        ],
      }),
      findPlannedExecutions: jest.fn().mockResolvedValue({
        count: 1,
        rows: [
          {
            uuid: 'planned-early',
            performedAt: '2026-08-22',
            createdAt: '2026-08-22T08:00:00.000Z',
            task: { uuid: 'task-1', title: 'Vidange', material: null },
            performedByUser: null,
            partUsages: [],
          },
        ],
      }),
      findInterventions: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
      findStockMovements: jest.fn().mockResolvedValue({
        count: 1,
        rows: [
          {
            uuid: 'stock-late',
            stockableId: 1,
            operation: 'order',
            performedAt: '2026-08-22',
            createdAt: '2026-08-22T09:20:00.000Z',
            performedByUser: null,
          },
        ],
        parts: [{ id: 1, uuid: 'part-1', name: 'Filtre', reference: 'FH-01' }],
      }),
      findPriceChanges: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    };

    const result = await new HistoryService(repository).list('maintenance');

    expect(result.items.map(({ uuid }) => uuid)).toEqual([
      'stock-late',
      'audit-1',
      'planned-early',
    ]);
  });
});
