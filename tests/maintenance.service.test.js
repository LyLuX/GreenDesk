import { jest } from '@jest/globals';
import MaintenanceService from '../src/modules/maintenance/service/maintenance.service.js';
import {
  addDaysDateOnly,
  todayDateOnly,
} from '../src/modules/maintenance/service/maintenance-deadline.service.js';

describe('MaintenanceService', () => {
  const createService = () => new MaintenanceService({ findAll: jest.fn() }, {}, {});

  it('returns every maintenance plan without pagination when requested', async () => {
    const service = new MaintenanceService(
      { findAll: jest.fn().mockResolvedValue({ count: 120, rows: [] }) },
      {},
      {},
    );

    await expect(service.getAll({ limit: 'all' })).resolves.toEqual({
      items: [],
      pagination: { page: 1, limit: 120, total: 120, totalPages: 1 },
    });
  });

  it('calculates the next calendar deadline', () => {
    expect(
      createService().calculateDeadlines({
        intervalDays: 30,
        lastMaintenanceDate: '2026-07-01',
      }),
    ).toEqual({ nextMaintenanceDate: '2026-07-31' });
  });

  it('requires a positive interval in days', () => {
    expect(() => createService().calculateDeadlines({})).toThrow(
      'Un intervalle en jours doit être renseigné.',
    );
  });

  it('requires the previous maintenance date', () => {
    expect(() => createService().calculateDeadlines({ intervalDays: 10 })).toThrow(
      'date du dernier entretien',
    );
  });

  it('executes calendar maintenance without recording engine hours', async () => {
    const today = todayDateOnly();
    const task = {
      id: 1,
      uuid: '11111111-1111-4111-8111-111111111111',
      intervalDays: 30,
      lastMaintenanceDate: addDaysDateOnly(today, -30),
      nextMaintenanceDate: today,
      material: {
        uuid: '22222222-2222-4222-8222-222222222222',
        name: 'Tondeuse',
      },
      toJSON() {
        return {
          id: this.id,
          uuid: this.uuid,
          intervalDays: this.intervalDays,
          lastMaintenanceDate: this.lastMaintenanceDate,
          nextMaintenanceDate: this.nextMaintenanceDate,
          material: this.material,
        };
      },
    };
    const repository = {
      withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
      findByUuid: jest.fn().mockResolvedValue(task),
      update: jest.fn((_task, values) => Object.assign(task, values)),
      createHistory: jest.fn().mockResolvedValue({
        uuid: '33333333-3333-4333-8333-333333333333',
        performedAt: today,
        comment: 'Entretien réalisé',
      }),
    };
    const auditService = { record: jest.fn() };
    const service = new MaintenanceService(repository, {}, auditService);

    await service.execute(task.uuid, { performedAt: today, comment: 'Entretien réalisé' }, 42);

    expect(repository.update).toHaveBeenCalledWith(
      task,
      {
        lastMaintenanceDate: today,
        nextMaintenanceDate: addDaysDateOnly(today, 30),
        updatedBy: 42,
      },
      { transaction: { id: 'transaction' } },
    );
    expect(repository.createHistory).toHaveBeenCalledWith(
      {
        maintenanceTaskId: task.id,
        performedAt: today,
        comment: 'Entretien réalisé',
        performedBy: 42,
      },
      { transaction: { id: 'transaction' } },
    );
  });
});
