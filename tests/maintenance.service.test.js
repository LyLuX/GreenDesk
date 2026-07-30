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

  it('derives the title and type from an operation and stores exact parts', async () => {
    const operation = {
      id: 8,
      uuid: '44444444-4444-4444-8444-444444444444',
      name: 'Remplacement des bougies',
      description: 'Description catalogue',
      maintenanceType: 'replacement',
      active: true,
    };
    const part = {
      id: 9,
      uuid: '55555555-5555-4555-8555-555555555555',
    };
    const createdTask = {
      id: 10,
      uuid: '66666666-6666-4666-8666-666666666666',
      toJSON() {
        return { id: this.id, uuid: this.uuid };
      },
    };
    const returnedTask = {
      ...createdTask,
      title: operation.name,
      maintenanceType: operation.maintenanceType,
      intervalDays: 365,
      lastMaintenanceDate: '2026-07-01',
      nextMaintenanceDate: '2027-07-01',
      operation,
      parts: [
        {
          ...part,
          name: 'Bougie',
          reference: 'BPMR8Y',
          unit: 'pièce',
          MaintenanceTaskPart: { quantity: 1 },
        },
      ],
      toJSON() {
        const values = { ...this };
        delete values.toJSON;
        return values;
      },
    };
    const repository = {
      withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
      create: jest.fn().mockResolvedValue(createdTask),
      replaceParts: jest.fn(),
      findByUuid: jest.fn().mockResolvedValue(returnedTask),
    };
    const catalogRepository = {
      findOperationByUuid: jest.fn().mockResolvedValue(operation),
      findPartsByUuids: jest.fn().mockResolvedValue([part]),
    };
    const auditService = { record: jest.fn() };
    const service = new MaintenanceService(
      repository,
      { getEntityByUuid: jest.fn().mockResolvedValue({ id: 7, active: true }) },
      auditService,
      catalogRepository,
    );

    const result = await service.create(
      {
        materialUuid: '77777777-7777-4777-8777-777777777777',
        operationUuid: operation.uuid,
        intervalDays: 365,
        lastMaintenanceDate: '2026-07-01',
        parts: [{ partUuid: part.uuid, quantity: 1 }],
      },
      42,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: operation.name,
        description: operation.description,
        maintenanceType: 'replacement',
        operationId: operation.id,
        materialId: 7,
      }),
      { transaction: { id: 'transaction' } },
    );
    expect(repository.replaceParts).toHaveBeenCalledWith(
      createdTask.id,
      [{ partId: part.id, quantity: 1 }],
      { transaction: { id: 'transaction' } },
    );
    expect(result.parts).toEqual([expect.objectContaining({ reference: 'BPMR8Y', quantity: 1 })]);
  });

  it('aggregates parts still required by plans even when the catalogue entry is inactive', async () => {
    const part = {
      uuid: '88888888-8888-4888-8888-888888888888',
      name: 'Bougie',
      manufacturer: 'NGK',
      reference: 'BPMR8Y',
      supplierReference: null,
      unit: 'pièce',
      active: false,
    };
    const task = (uuid, materialName, quantity) => ({
      uuid,
      title: 'Remplacement des bougies',
      intervalDays: 365,
      lastMaintenanceDate: '2025-08-01',
      nextMaintenanceDate: '2026-08-01',
      material: { uuid: `${uuid.slice(0, -1)}2`, name: materialName },
      parts: [{ ...part, MaintenanceTaskPart: { quantity } }],
    });
    const repository = {
      findForOrderList: jest
        .fn()
        .mockResolvedValue([
          task('11111111-1111-4111-8111-111111111111', 'Tronçonneuse 1', 1),
          task('22222222-2222-4222-8222-222222222222', 'Tronçonneuse 2', 2),
        ]),
    };
    const service = new MaintenanceService(repository, {}, {}, {});

    const result = await service.getOrderList({ horizonDays: 30, includeOverdue: true });

    expect(result.items).toEqual([
      expect.objectContaining({
        reference: 'BPMR8Y',
        quantity: 3,
        plans: expect.arrayContaining([
          expect.objectContaining({
            material: expect.objectContaining({ name: 'Tronçonneuse 1' }),
          }),
          expect.objectContaining({
            material: expect.objectContaining({ name: 'Tronçonneuse 2' }),
          }),
        ]),
      }),
    ]);
  });

  it('uses the exact maintenance deadline status for the order list', async () => {
    const repository = { findForOrderList: jest.fn().mockResolvedValue([]) };
    const service = new MaintenanceService(repository, {}, {}, {});

    const result = await service.getOrderList({
      status: 'overdue',
      horizonDays: 0,
      includeOverdue: true,
    });

    expect(repository.findForOrderList).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'overdue' }),
    );
    expect(result.status).toBe('overdue');
  });

  it('executes calendar maintenance without recording engine hours', async () => {
    const today = todayDateOnly();
    const task = {
      id: 1,
      uuid: '11111111-1111-4111-8111-111111111111',
      active: true,
      intervalDays: 30,
      lastMaintenanceDate: addDaysDateOnly(today, -30),
      nextMaintenanceDate: today,
      material: {
        uuid: '22222222-2222-4222-8222-222222222222',
        name: 'Tondeuse',
        active: true,
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

  it('refuses to create a plan for an inactive material', async () => {
    const repository = {
      create: jest.fn(),
      withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
    };
    const service = new MaintenanceService(
      repository,
      { getEntityByUuid: jest.fn().mockResolvedValue({ id: 7, active: false }) },
      {},
      {},
    );

    await expect(
      service.create(
        {
          materialUuid: '77777777-7777-4777-8777-777777777777',
          intervalDays: 30,
          lastMaintenanceDate: '2026-07-01',
        },
        42,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses to reactivate a plan while its material is inactive', async () => {
    const task = {
      uuid: '11111111-1111-4111-8111-111111111111',
      active: false,
      material: { active: false },
      toJSON: () => ({ active: false }),
    };
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(task),
      update: jest.fn(),
      withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
    };
    const service = new MaintenanceService(repository, {}, {}, {});

    await expect(service.changeStatus(task.uuid, true, 42)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(repository.update).not.toHaveBeenCalled();
  });
});
