import { jest } from '@jest/globals';
import MaintenanceService from '../src/modules/maintenance/service/maintenance.service.js';
import {
  addDaysDateOnly,
  todayDateOnly,
} from '../src/modules/maintenance/service/maintenance-deadline.service.js';

describe('MaintenanceService', () => {
  const createService = () => new MaintenanceService({ findAll: jest.fn() }, {}, {});

  it('caps maintenance plan pages at an allowed size', async () => {
    const service = new MaintenanceService(
      { findAll: jest.fn().mockResolvedValue({ count: 120, rows: [] }) },
      {},
      {},
    );

    await expect(service.getAll({ limit: 25 })).resolves.toEqual({
      items: [],
      pagination: { page: 1, limit: 25, total: 120, totalPages: 5 },
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

  it('keeps wear-based maintenance without a calendar deadline', () => {
    expect(
      createService().calculateDeadlines({
        intervalDays: 0,
        lastMaintenanceDate: '2026-07-01',
      }),
    ).toEqual({ nextMaintenanceDate: null });
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
      quantityOnHand: 0,
      quantityOnOrder: 0,
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

  it('only returns quantities not covered by workshop stock or current orders', async () => {
    const makeTask = (uuid, partKey, quantityOnHand, quantityOnOrder, requiredQuantity = 2) => ({
      uuid,
      title: 'Entretien',
      nextMaintenanceDate: '2026-08-20',
      material: { uuid, name: `Matériel ${partKey}` },
      parts: [
        {
          uuid: `part-${partKey}`,
          name: `Pièce ${partKey}`,
          reference: `REF-${partKey}`,
          unit: 'pièce',
          quantityOnHand,
          quantityOnOrder,
          MaintenanceTaskPart: { quantity: requiredQuantity },
        },
      ],
    });
    const repository = {
      findForOrderList: jest
        .fn()
        .mockResolvedValue([
          makeTask('11111111-1111-4111-8111-111111111111', 'to-order', 0, 0),
          makeTask('22222222-2222-4222-8222-222222222222', 'ordered-covered', 0, 2),
          makeTask('33333333-3333-4333-8333-333333333333', 'stock-covered', 5, 0, 4),
          makeTask('44444444-4444-4444-8444-444444444444', 'stock-shortage', 1, 0),
          makeTask('55555555-5555-4555-8555-555555555555', 'ordered-shortage', 0, 1),
        ]),
    };
    const service = new MaintenanceService(repository, {}, {}, {});

    const result = await service.getOrderList();

    expect(result.items).toEqual([
      expect.objectContaining({ reference: 'REF-ordered-shortage', quantity: 1 }),
      expect.objectContaining({ reference: 'REF-stock-shortage', quantity: 1 }),
      expect.objectContaining({ reference: 'REF-to-order', quantity: 2 }),
    ]);
    expect(result.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reference: 'REF-stock-covered' }),
        expect.objectContaining({ reference: 'REF-ordered-covered' }),
      ]),
    );
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

  it('optionally includes wear-based plans in the order list', async () => {
    const repository = { findForOrderList: jest.fn().mockResolvedValue([]) };
    const service = new MaintenanceService(repository, {}, {}, {});

    const result = await service.getOrderList({
      horizonDays: 60,
      includeOverdue: 'false',
      includeWearBased: 'true',
    });

    expect(repository.findForOrderList).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ through: expect.any(String), from: expect.any(String) }),
    );
    expect(repository.findForOrderList).toHaveBeenNthCalledWith(2, { status: 'wearBased' });
    expect(result.includeOverdue).toBe(false);
    expect(result.includeWearBased).toBe(true);
  });

  it('identifies wear-based needs in order-list plan details', async () => {
    const repository = {
      findForOrderList: jest.fn().mockResolvedValue([
        {
          uuid: '11111111-1111-4111-8111-111111111111',
          title: 'Contrôle de lame',
          intervalDays: 0,
          nextMaintenanceDate: null,
          material: { uuid: '22222222-2222-4222-8222-222222222222', name: 'Tondeuse' },
          parts: [
            {
              uuid: '33333333-3333-4333-8333-333333333333',
              name: 'Lame',
              reference: 'LAME-42',
              unit: 'pièce',
              quantityOnHand: 0,
              quantityOnOrder: 0,
              MaintenanceTaskPart: { quantity: 1 },
            },
          ],
        },
      ]),
    };
    const service = new MaintenanceService(repository, {}, {}, {});

    const result = await service.getOrderList({ includeWearBased: true });

    expect(result.items[0].plans[0]).toEqual(
      expect.objectContaining({ wearBased: true, nextMaintenanceDate: null }),
    );
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
        executionType: 'standard',
        partsSnapshot: null,
        performedBy: 42,
      },
      { transaction: { id: 'transaction' } },
    );
  });

  it('executes wear-based maintenance without creating a calendar deadline', async () => {
    const today = todayDateOnly();
    const task = {
      id: 1,
      uuid: '11111111-1111-4111-8111-111111111111',
      active: true,
      intervalDays: 0,
      lastMaintenanceDate: addDaysDateOnly(today, -30),
      nextMaintenanceDate: null,
      material: { active: true },
      parts: [],
      toJSON() {
        return { ...this, toJSON: undefined };
      },
    };
    const repository = {
      withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
      findByUuid: jest.fn().mockResolvedValue(task),
      update: jest.fn((_task, values) => Object.assign(task, values)),
      createHistory: jest.fn().mockResolvedValue({ uuid: 'history-uuid', performedAt: today }),
    };
    const service = new MaintenanceService(repository, {}, { record: jest.fn() });

    const result = await service.execute(task.uuid, { performedAt: today }, 42);

    expect(repository.update).toHaveBeenCalledWith(
      task,
      { lastMaintenanceDate: today, nextMaintenanceDate: null, updatedBy: 42 },
      { transaction: { id: 'transaction' } },
    );
    expect(result.task.status).toBe('wearBased');
    expect(result.task.remainingDays).toBeNull();
  });

  it('consumes every required part in the same transaction as maintenance execution', async () => {
    const today = todayDateOnly();
    const taskPart = {
      id: 9,
      uuid: '99999999-9999-4999-8999-999999999999',
      MaintenanceTaskPart: { quantity: 2 },
    };
    const task = {
      id: 1,
      uuid: '11111111-1111-4111-8111-111111111111',
      active: true,
      intervalDays: 30,
      lastMaintenanceDate: addDaysDateOnly(today, -30),
      material: { active: true },
      parts: [taskPart],
      toJSON: () => ({ uuid: '11111111-1111-4111-8111-111111111111' }),
    };
    const transaction = { id: 'transaction' };
    const repository = {
      withTransaction: jest.fn((callback) => callback(transaction)),
      findByUuid: jest.fn().mockResolvedValue(task),
      update: jest.fn(),
      createHistory: jest.fn().mockResolvedValue({ id: 12, uuid: 'history-uuid' }),
      createPartUsages: jest.fn(),
    };
    const lockedPart = {
      id: 9,
      uuid: taskPart.uuid,
      name: 'Filtre',
      reference: 'F-100',
      unit: 'pièce',
      unitPrice: 12.5,
      quantityOnHand: 3,
      quantityOnOrder: 0,
    };
    const catalogRepository = { findPartsByIds: jest.fn().mockResolvedValue([lockedPart]) };
    const stockService = { apply: jest.fn() };
    const service = new MaintenanceService(
      repository,
      {},
      { record: jest.fn() },
      catalogRepository,
      stockService,
    );

    await service.execute(task.uuid, { performedAt: today }, 42);

    expect(catalogRepository.findPartsByIds).toHaveBeenCalledWith([9], {
      transaction,
      lock: true,
    });
    expect(stockService.apply).toHaveBeenCalledWith(
      lockedPart,
      expect.objectContaining({
        operation: 'consume',
        quantity: 2,
        performedAt: today,
        source: { type: 'maintenanceTask', uuid: task.uuid },
      }),
      { transaction },
    );
    expect(repository.createPartUsages).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          maintenanceHistoryId: 12,
          maintenancePartId: 9,
          quantity: 2,
          unitPrice: 12.5,
          totalCost: 25,
          performedAt: today,
        }),
      ],
      { transaction },
    );
  });

  it('executes maintenance without consuming parts after an explicit justified choice', async () => {
    const today = todayDateOnly();
    const taskPart = {
      id: 9,
      uuid: '99999999-9999-4999-8999-999999999999',
      name: 'Filtre à huile',
      reference: 'FH-100',
      unit: 'pièce',
      MaintenanceTaskPart: { quantity: 2 },
    };
    const task = {
      id: 1,
      uuid: '11111111-1111-4111-8111-111111111111',
      active: true,
      intervalDays: 30,
      lastMaintenanceDate: addDaysDateOnly(today, -30),
      material: { active: true },
      parts: [taskPart],
      toJSON: () => ({ uuid: '11111111-1111-4111-8111-111111111111' }),
    };
    const transaction = { id: 'transaction' };
    const repository = {
      withTransaction: jest.fn((callback) => callback(transaction)),
      findByUuid: jest.fn().mockResolvedValue(task),
      update: jest.fn(),
      createHistory: jest.fn().mockResolvedValue({ uuid: 'history-uuid' }),
    };
    const catalogRepository = { findPartsByIds: jest.fn() };
    const stockService = { apply: jest.fn() };
    const auditService = { record: jest.fn() };
    const service = new MaintenanceService(
      repository,
      {},
      auditService,
      catalogRepository,
      stockService,
    );

    await service.execute(
      task.uuid,
      {
        performedAt: today,
        comment: 'Filtre encore en bon état',
        partsAction: 'skip',
      },
      42,
    );

    expect(catalogRepository.findPartsByIds).not.toHaveBeenCalled();
    expect(stockService.apply).not.toHaveBeenCalled();
    expect(repository.createHistory).toHaveBeenCalledWith(
      {
        maintenanceTaskId: task.id,
        performedAt: today,
        comment: 'Filtre encore en bon état',
        executionType: 'withoutPartReplacement',
        partsSnapshot: [
          {
            uuid: taskPart.uuid,
            name: taskPart.name,
            reference: taskPart.reference,
            unit: taskPart.unit,
            quantity: 2,
            unitPrice: 0,
            totalCost: 0,
            consumed: false,
          },
        ],
        performedBy: 42,
      },
      { transaction },
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EXECUTE_WITHOUT_PARTS' }),
      { transaction },
    );
  });

  it('requires a justification when maintenance is executed without changing parts', async () => {
    const task = {
      id: 1,
      uuid: '11111111-1111-4111-8111-111111111111',
      active: true,
      intervalDays: 30,
      material: { active: true },
      parts: [{ id: 9 }],
      toJSON: () => ({}),
    };
    const repository = {
      withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
      findByUuid: jest.fn().mockResolvedValue(task),
      update: jest.fn(),
      createHistory: jest.fn(),
    };
    const service = new MaintenanceService(repository, {}, { record: jest.fn() });

    await expect(service.execute(task.uuid, { partsAction: 'skip' }, 42)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Un commentaire est obligatoire sans changement de pièce.',
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not complete maintenance when a required part is unavailable', async () => {
    const today = todayDateOnly();
    const task = {
      id: 1,
      uuid: '11111111-1111-4111-8111-111111111111',
      active: true,
      intervalDays: 30,
      lastMaintenanceDate: addDaysDateOnly(today, -30),
      material: { active: true },
      parts: [{ id: 9, MaintenanceTaskPart: { quantity: 2 } }],
      toJSON: () => ({}),
    };
    const repository = {
      withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
      findByUuid: jest.fn().mockResolvedValue(task),
      update: jest.fn(),
      createHistory: jest.fn(),
    };
    const stockError = Object.assign(new Error('Stock insuffisant'), { statusCode: 409 });
    const service = new MaintenanceService(
      repository,
      {},
      { record: jest.fn() },
      { findPartsByIds: jest.fn().mockResolvedValue([{ id: 9 }]) },
      { apply: jest.fn().mockRejectedValue(stockError) },
    );

    await expect(service.execute(task.uuid, { performedAt: today }, 42)).rejects.toBe(stockError);
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.createHistory).not.toHaveBeenCalled();
  });

  it('records an unplanned intervention and its part cost in one transaction', async () => {
    const today = todayDateOnly();
    const transaction = { id: 'transaction' };
    const material = {
      id: 7,
      uuid: '77777777-7777-4777-8777-777777777777',
      active: true,
    };
    const part = {
      id: 9,
      uuid: '99999999-9999-4999-8999-999999999999',
      name: 'Grille',
      reference: 'GR-100',
      unit: 'pièce',
      unitPrice: 18.5,
      quantityOnHand: 2,
    };
    const intervention = {
      id: 12,
      uuid: '12121212-1212-4212-8212-121212121212',
    };
    const fullIntervention = {
      ...intervention,
      material: { uuid: material.uuid, name: 'Tondeuse' },
      description: 'Grille cassée',
      performedAt: today,
      partUsages: [
        {
          uuid: '13131313-1313-4313-8313-131313131313',
          partUuid: part.uuid,
          partName: part.name,
          partReference: part.reference,
          unit: part.unit,
          quantity: 1,
          unitPrice: '18.50',
          totalCost: '18.50',
        },
      ],
    };
    const repository = {
      withTransaction: jest.fn((callback) => callback(transaction)),
      createIntervention: jest.fn().mockResolvedValue(intervention),
      createPartUsages: jest.fn(),
      findInterventionByUuid: jest.fn().mockResolvedValue(fullIntervention),
    };
    const stockService = { apply: jest.fn() };
    const auditService = { record: jest.fn() };
    const service = new MaintenanceService(
      repository,
      { getEntityByUuid: jest.fn().mockResolvedValue(material) },
      auditService,
      { findPartsByUuids: jest.fn().mockResolvedValue([part]) },
      stockService,
    );

    const result = await service.createIntervention(
      {
        materialUuid: material.uuid,
        description: '  Grille cassée  ',
        performedAt: today,
        parts: [{ partUuid: part.uuid, quantity: 1 }],
      },
      42,
    );

    expect(repository.createIntervention).toHaveBeenCalledWith(
      { materialId: 7, description: 'Grille cassée', performedAt: today, performedBy: 42 },
      { transaction },
    );
    expect(stockService.apply).toHaveBeenCalledWith(
      part,
      expect.objectContaining({
        operation: 'consume',
        quantity: 1,
        source: { type: 'maintenanceIntervention', uuid: intervention.uuid },
      }),
      { transaction },
    );
    expect(repository.createPartUsages).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          maintenanceInterventionId: 12,
          maintenancePartId: 9,
          totalCost: 18.5,
        }),
      ],
      { transaction },
    );
    expect(result).toEqual(expect.objectContaining({ totalCost: 18.5 }));
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'MAINTENANCE_INTERVENTION' }),
      { transaction },
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
