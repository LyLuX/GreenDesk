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

  it('assigns only a compatible model-specific template', async () => {
    const material = {
      id: 3,
      brandId: 2,
      model: 'CS-621SX',
      uuid: '22222222-2222-4222-8222-222222222222',
      name: 'Tronçonneuse',
    };
    const template = {
      id: 7,
      uuid: '33333333-3333-4333-8333-333333333333',
      intervalDays: 365,
      active: true,
    };
    const created = {
      uuid: '44444444-4444-4444-8444-444444444444',
      toJSON: () => ({ uuid: '44444444-4444-4444-8444-444444444444' }),
    };
    const repository = {
      findByMaterialAndTemplate: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(created),
      findByUuid: jest.fn().mockResolvedValue({
        ...created,
        material,
        template,
        lastMaintenanceDate: '2026-07-01',
        nextMaintenanceDate: '2027-07-01',
      }),
    };
    const materialService = { getEntityByUuid: jest.fn().mockResolvedValue(material) };
    const auditService = { record: jest.fn() };
    const templateService = {
      getEntityByUuid: jest.fn().mockResolvedValue(template),
      isCompatible: jest.fn().mockReturnValue(true),
      toPublic: jest.fn().mockReturnValue({
        uuid: template.uuid,
        title: 'Bougie',
        intervalDays: 365,
        priority: 'normal',
      }),
    };
    const service = new MaintenanceService(
      repository,
      materialService,
      auditService,
      templateService,
    );

    await service.create(
      {
        materialUuid: material.uuid,
        templateUuid: template.uuid,
        lastMaintenanceDate: '2026-07-01',
        notes: null,
      },
      42,
    );

    expect(repository.create).toHaveBeenCalledWith({
      lastMaintenanceDate: '2026-07-01',
      nextMaintenanceDate: '2027-07-01',
      notes: null,
      materialId: 3,
      templateId: 7,
      createdBy: 42,
      updatedBy: 42,
    });
    expect(templateService.isCompatible).toHaveBeenCalledWith(template, material);
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
