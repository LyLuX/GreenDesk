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
      context: { label: 'Tracteur' },
    });
  });
});
