import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import { STOCK_OPERATIONS, STOCKABLE_TYPES } from '../../../core/inventory/stock-operation.js';
import StockService from '../../../core/inventory/stock.service.js';
import { getStockAvailability } from '../../../core/inventory/stock-status.js';
import {
  addStockQuantities,
  isValidStockQuantity,
} from '../../../core/inventory/stock-quantity.js';
import AuditService from '../../audit/service/audit.service.js';
import { normalizePagination, paginatedResult } from '../../../core/utils/pagination.js';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
import { multiplyMoney } from '../../../core/utils/money.js';
import MaterialService from '../../materials/service/material.service.js';
import MaintenanceCatalogRepository from '../repository/maintenance-catalog.repository.js';
import MaintenanceRepository from '../repository/maintenance.repository.js';
import {
  MAINTENANCE_DEADLINE_STATUSES,
  MAINTENANCE_EXECUTION_TYPES,
  MAINTENANCE_PART_ACTIONS,
} from '../maintenance.constants.js';
import {
  addDaysDateOnly,
  getDeadlineDetails,
  parseDateOnly,
  todayDateOnly,
} from './maintenance-deadline.service.js';

const has = (object, key) => Object.hasOwn(object, key);
const partUsageSnapshot = (part, quantity, consumed) => {
  const unitPrice = Number(part.unitPrice ?? 0);
  return {
    uuid: part.uuid,
    name: part.name,
    reference: part.reference,
    unit: part.unit,
    quantity,
    unitPrice,
    totalCost: consumed ? Number(multiplyMoney(unitPrice, quantity)) : 0,
    consumed,
  };
};

/** Calculates maintenance deadlines and records completed maintenance. */
export default class MaintenanceService {
  constructor(
    repository = new MaintenanceRepository(),
    materialService = new MaterialService(),
    auditService = new AuditService(),
    catalogRepository = new MaintenanceCatalogRepository(),
    stockService = new StockService(),
  ) {
    this.repository = repository;
    this.materialService = materialService;
    this.auditService = auditService;
    this.catalogRepository = catalogRepository;
    this.stockService = stockService;
  }
  async getAll(query) {
    const result = await this.repository.findAll(query);
    return paginatedResult(result, normalizePagination(query), (task) => this.toPublic(task));
  }
  async getByUuid(uuid) {
    return this.toPublic(await this.getEntityByUuid(uuid));
  }
  async getEntityByUuid(uuid) {
    const task = await this.repository.findByUuid(uuid);
    if (!task) throw new AppError('Tâche de maintenance introuvable.', HTTP_STATUS.NOT_FOUND);
    return task;
  }
  calculateDeadlines(values, current = {}) {
    const intervalDays = has(values, 'intervalDays') ? values.intervalDays : current.intervalDays;
    if (intervalDays === undefined || intervalDays === null || intervalDays === '')
      throw new AppError('Un intervalle en jours doit être renseigné.', HTTP_STATUS.BAD_REQUEST);
    const normalizedInterval = Number(intervalDays);
    if (!Number.isInteger(normalizedInterval) || normalizedInterval < 0)
      throw new AppError(
        'L’intervalle en jours doit être un entier positif ou nul.',
        HTTP_STATUS.BAD_REQUEST,
      );
    const lastMaintenanceDate = has(values, 'lastMaintenanceDate')
      ? values.lastMaintenanceDate
      : current.lastMaintenanceDate;
    if (!lastMaintenanceDate)
      throw new AppError(
        'La date du dernier entretien est requise pour un intervalle en jours.',
        HTTP_STATUS.BAD_REQUEST,
      );
    if (normalizedInterval === 0) return { nextMaintenanceDate: null };
    return {
      nextMaintenanceDate: addDaysDateOnly(lastMaintenanceDate, normalizedInterval),
    };
  }
  async create(values, userId) {
    const deadlines = this.calculateDeadlines(values);
    const { operationUuid, parts = [] } = values;
    const planValues = { ...values };
    delete planValues.materialUuid;
    delete planValues.operationUuid;
    delete planValues.parts;
    const task = await this.repository.withTransaction(async (transaction) => {
      const material = await this.materialService.getEntityByUuid(values.materialUuid, {
        transaction,
        lock: true,
      });
      if (!material.active) {
        throw new AppError(
          'Un plan de maintenance ne peut pas être créé pour un matériel inactif.',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      const operation = operationUuid
        ? await this.resolveOperation(operationUuid, transaction)
        : null;
      const resolvedParts = await this.resolveParts(parts, transaction);
      const created = await this.repository.create(
        {
          ...planValues,
          ...(operation
            ? {
                title: operation.name,
                maintenanceType: operation.maintenanceType,
                operationId: operation.id,
                ...(Object.hasOwn(planValues, 'description')
                  ? {}
                  : { description: operation.description }),
              }
            : {}),
          ...deadlines,
          materialId: material.id,
          createdBy: userId,
          updatedBy: userId,
        },
        { transaction },
      );
      await this.repository.replaceParts(created.id, resolvedParts, { transaction });
      await this.auditService.record(
        {
          userId,
          action: 'CREATE',
          entity: 'MAINTENANCE_TASK',
          entityUuid: created.uuid,
          newValues: created.toJSON(),
        },
        { transaction },
      );
      return created;
    });
    return this.toPublic(await this.repository.findByUuid(task.uuid));
  }
  async update(uuid, values, userId) {
    const task = await this.getEntityByUuid(uuid);
    const oldValues = task.toJSON();
    const deadlines = this.calculateDeadlines(values, task);
    const { operationUuid, parts } = values;
    const planValues = { ...values };
    delete planValues.operationUuid;
    delete planValues.parts;
    await this.repository.withTransaction(async (transaction) => {
      const operation = operationUuid
        ? await this.resolveOperation(operationUuid, transaction)
        : task.operation;
      await this.repository.update(
        task,
        {
          ...planValues,
          ...(operation
            ? {
                title: operation.name,
                maintenanceType: operation.maintenanceType,
                operationId: operation.id,
              }
            : {}),
          ...deadlines,
          updatedBy: userId,
        },
        { transaction },
      );
      if (parts !== undefined) {
        await this.repository.replaceParts(task.id, await this.resolveParts(parts, transaction), {
          transaction,
        });
      }
      await this.auditService.record(
        {
          userId,
          action: 'UPDATE',
          entity: 'MAINTENANCE_TASK',
          entityUuid: task.uuid,
          oldValues,
          newValues: task.toJSON(),
        },
        { transaction },
      );
    });
    return this.toPublic(await this.repository.findByUuid(task.uuid));
  }
  async changeStatus(uuid, active, userId) {
    let task;
    let oldValues;
    await this.repository.withTransaction(async (transaction) => {
      task = await this.repository.findByUuid(uuid, { transaction, lock: true });
      if (!task) throw new AppError('Tâche de maintenance introuvable.', HTTP_STATUS.NOT_FOUND);
      if (active && !task.material?.active) {
        throw new AppError(
          'Ce plan ne peut pas être activé tant que son matériel est inactif.',
          HTTP_STATUS.CONFLICT,
        );
      }
      oldValues = task.toJSON();
      await this.repository.update(task, { active, updatedBy: userId }, { transaction });
      await this.auditService.record(
        {
          userId,
          action: 'STATUS_CHANGE',
          entity: 'MAINTENANCE_TASK',
          entityUuid: task.uuid,
          oldValues,
          newValues: task.toJSON(),
        },
        { transaction },
      );
    });
    return this.toPublic(task);
  }
  async remove(uuid, userId) {
    await this.repository.withTransaction(async (transaction) => {
      const task = await this.repository.findByUuid(uuid, { transaction, lock: true });
      if (!task) throw new AppError('Tâche de maintenance introuvable.', HTTP_STATUS.NOT_FOUND);
      const oldValues = task.toJSON();
      await this.repository.remove(task, { transaction });
      await this.auditService.record(
        { userId, action: 'DELETE', entity: 'MAINTENANCE_TASK', entityUuid: task.uuid, oldValues },
        { transaction },
      );
    });
  }
  async execute(uuid, values, userId) {
    const result = await this.repository.withTransaction(async (transaction) => {
      const task = await this.repository.findByUuid(uuid, { transaction, lock: true });
      if (!task) throw new AppError('Tâche de maintenance introuvable.', HTTP_STATUS.NOT_FOUND);
      if (!task.active || !task.material?.active) {
        throw new AppError(
          'Un entretien ne peut pas être exécuté sur un plan ou un matériel inactif.',
          HTTP_STATUS.CONFLICT,
        );
      }
      const oldValues = task.toJSON();
      const performedAt = values.performedAt ?? todayDateOnly();
      const date = parseDateOnly(performedAt);
      if (date > parseDateOnly(todayDateOnly()))
        throw new AppError(
          'Un entretien ne peut pas être réalisé dans le futur.',
          HTTP_STATUS.BAD_REQUEST,
        );
      if (task.lastMaintenanceDate && date < parseDateOnly(task.lastMaintenanceDate))
        throw new AppError(
          'La date réalisée ne peut pas précéder le dernier entretien.',
          HTTP_STATUS.BAD_REQUEST,
        );
      const taskParts = task.parts ?? [];
      const skipParts = values.partsAction === MAINTENANCE_PART_ACTIONS.SKIP;
      if (skipParts && !values.comment?.trim()) {
        throw new AppError(
          'Un commentaire est obligatoire sans changement de pièce.',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      if (skipParts && !taskParts.length) {
        throw new AppError(
          'Ce plan ne contient aucune pièce à ne pas remplacer.',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      let partsSnapshot = taskParts.length ? [] : null;
      const partUsages = [];
      if (skipParts) {
        partsSnapshot = taskParts.map((part) =>
          partUsageSnapshot(part, Number(part.MaintenanceTaskPart?.quantity ?? 1), false),
        );
      }
      if (!skipParts) {
        const lockedParts = taskParts.length
          ? await this.catalogRepository.findPartsByIds(
              taskParts.map((part) => part.id),
              { transaction, lock: true },
            )
          : [];
        const lockedPartById = new Map(lockedParts.map((part) => [String(part.id), part]));
        for (const taskPart of taskParts) {
          const part = lockedPartById.get(String(taskPart.id));
          if (!part) {
            throw new AppError('Une pièce associée au plan est introuvable.', HTTP_STATUS.CONFLICT);
          }
          const quantity = Number(taskPart.MaintenanceTaskPart?.quantity ?? 1);
          const snapshot = partUsageSnapshot(part, quantity, true);
          partsSnapshot.push(snapshot);
          partUsages.push({
            maintenancePartId: part.id,
            partUuid: snapshot.uuid,
            partName: snapshot.name,
            partReference: snapshot.reference,
            unit: snapshot.unit,
            quantity: snapshot.quantity,
            unitPrice: snapshot.unitPrice,
            totalCost: snapshot.totalCost,
            performedAt,
          });
          await this.stockService.apply(
            part,
            {
              stockableType: STOCKABLE_TYPES.MAINTENANCE_PART,
              operation: STOCK_OPERATIONS.CONSUME,
              quantity,
              performedAt,
              userId,
              source: { type: 'maintenanceTask', uuid: task.uuid },
            },
            { transaction },
          );
        }
      }
      const update = {
        lastMaintenanceDate: performedAt,
        updatedBy: userId,
      };
      const deadlines = this.calculateDeadlines(update, task);
      await this.repository.update(task, { ...update, ...deadlines }, { transaction });
      const history = await this.repository.createHistory(
        {
          maintenanceTaskId: task.id,
          performedAt,
          comment: values.comment ?? null,
          executionType: skipParts
            ? MAINTENANCE_EXECUTION_TYPES.WITHOUT_PART_REPLACEMENT
            : MAINTENANCE_EXECUTION_TYPES.STANDARD,
          partsSnapshot,
          performedBy: userId,
        },
        { transaction },
      );
      if (partUsages.length) {
        await this.repository.createPartUsages(
          partUsages.map((usage) => ({ ...usage, maintenanceHistoryId: history.id })),
          { transaction },
        );
      }
      await this.auditService.record(
        {
          userId,
          action: skipParts ? 'EXECUTE_WITHOUT_PARTS' : 'EXECUTE',
          entity: 'MAINTENANCE_TASK',
          entityUuid: task.uuid,
          oldValues,
          newValues: task.toJSON(),
        },
        { transaction },
      );
      return { task, history, oldValues };
    });
    return { task: this.toPublic(result.task), history: this.toHistory(result.history) };
  }
  async getHistory(uuid, query = {}) {
    const task = await this.getEntityByUuid(uuid);
    const result = await this.repository.findHistory(task.id, query);
    return paginatedResult(result, normalizePagination(query), (history) =>
      this.toHistory(history),
    );
  }
  async createIntervention(values, userId) {
    const performedAt = values.performedAt ?? todayDateOnly();
    if (parseDateOnly(performedAt) > parseDateOnly(todayDateOnly())) {
      throw new AppError(
        'Une intervention ne peut pas être réalisée dans le futur.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const description = values.description?.trim();
    if (!description) {
      throw new AppError('Une description de l’intervention est requise.', HTTP_STATUS.BAD_REQUEST);
    }
    const requestedParts = values.parts ?? [];
    const partUuids = requestedParts.map(({ partUuid }) => partUuid);
    if (!partUuids.length || new Set(partUuids).size !== partUuids.length) {
      throw new AppError(
        partUuids.length
          ? 'Une pièce ne peut apparaître qu’une fois.'
          : 'Au moins une pièce utilisée doit être renseignée.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const interventionUuid = await this.repository.withTransaction(async (transaction) => {
      const material = await this.materialService.getEntityByUuid(values.materialUuid, {
        transaction,
        lock: true,
      });
      if (!material.active) {
        throw new AppError(
          'Une intervention ne peut pas être enregistrée sur un matériel inactif.',
          HTTP_STATUS.CONFLICT,
        );
      }
      const parts = await this.catalogRepository.findPartsByUuids(partUuids, {
        transaction,
        lock: true,
      });
      if (parts.length !== partUuids.length) {
        throw new AppError(
          'Une ou plusieurs pièces sont introuvables ou inactives.',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      const partByUuid = new Map(parts.map((part) => [part.uuid, part]));
      const intervention = await this.repository.createIntervention(
        { materialId: material.id, description, performedAt, performedBy: userId },
        { transaction },
      );
      const usages = [];
      for (const requestedPart of requestedParts) {
        const part = partByUuid.get(requestedPart.partUuid);
        const quantity = Number(requestedPart.quantity);
        if (!isValidStockQuantity(quantity)) {
          throw new AppError('Les quantités de pièces sont invalides.', HTTP_STATUS.BAD_REQUEST);
        }
        const snapshot = partUsageSnapshot(part, quantity, true);
        usages.push({
          maintenanceInterventionId: intervention.id,
          maintenancePartId: part.id,
          partUuid: snapshot.uuid,
          partName: snapshot.name,
          partReference: snapshot.reference,
          unit: snapshot.unit,
          quantity,
          unitPrice: snapshot.unitPrice,
          totalCost: snapshot.totalCost,
          performedAt,
        });
        await this.stockService.apply(
          part,
          {
            stockableType: STOCKABLE_TYPES.MAINTENANCE_PART,
            operation: STOCK_OPERATIONS.CONSUME,
            quantity,
            performedAt,
            userId,
            source: { type: 'maintenanceIntervention', uuid: intervention.uuid },
          },
          { transaction },
        );
      }
      await this.repository.createPartUsages(usages, { transaction });
      await this.auditService.record(
        {
          userId,
          action: 'CREATE',
          entity: 'MAINTENANCE_INTERVENTION',
          entityUuid: intervention.uuid,
          newValues: {
            materialUuid: material.uuid,
            description,
            performedAt,
            parts: requestedParts,
          },
        },
        { transaction },
      );
      return intervention.uuid;
    });
    return this.toIntervention(await this.repository.findInterventionByUuid(interventionUuid));
  }
  async getInterventions(query = {}) {
    const result = await this.repository.findInterventions(query);
    return paginatedResult(result, normalizePagination(query), (intervention) =>
      this.toIntervention(intervention),
    );
  }
  async getOrderList({
    horizonDays = 30,
    includeOverdue = true,
    includeWearBased = false,
    includeLowStock = false,
    lowStockOnly = false,
    status,
  } = {}) {
    const normalizedHorizon = Math.min(Math.max(Number(horizonDays) || 0, 0), 365);
    const normalizedStatus = MAINTENANCE_DEADLINE_STATUSES.includes(status) ? status : undefined;
    const normalizedIncludeOverdue = normalizeBooleanFilter(includeOverdue) ?? true;
    const today = todayDateOnly();
    const through = addDaysDateOnly(today, normalizedHorizon);
    const includeWearBasedPlans = normalizeBooleanFilter(includeWearBased) ?? false;
    const lowStockOnlyFilter = normalizeBooleanFilter(lowStockOnly) ?? false;
    const includeLowStockParts =
      lowStockOnlyFilter || (normalizeBooleanFilter(includeLowStock) ?? false);
    const [deadlineTasks, wearBasedTasks, lowStockParts] = await Promise.all([
      lowStockOnlyFilter
        ? Promise.resolve([])
        : this.repository.findForOrderList({
            from: normalizedIncludeOverdue ? undefined : today,
            through,
            status: normalizedStatus,
          }),
      !lowStockOnlyFilter && includeWearBasedPlans && normalizedStatus !== 'wearBased'
        ? this.repository.findForOrderList({ status: 'wearBased' })
        : Promise.resolve([]),
      includeLowStockParts ? this.catalogRepository.findLowStockParts() : Promise.resolve([]),
    ]);
    const tasks = [
      ...new Map([...deadlineTasks, ...wearBasedTasks].map((task) => [task.uuid, task])).values(),
    ];
    const grouped = new Map();
    for (const task of tasks.map((item) => this.toPublic(item))) {
      for (const part of task.parts ?? []) {
        const current = grouped.get(part.uuid) ?? {
          uuid: part.uuid,
          name: part.name,
          manufacturer: part.manufacturer,
          manufacturerUuid: part.manufacturerUuid,
          supplier: part.supplier,
          supplierUuid: part.supplierUuid,
          reference: part.reference,
          supplierReference: part.supplierReference,
          unit: part.unit,
          unitPrice: Number(part.unitPrice ?? 0),
          quantityOnHand: part.quantityOnHand,
          quantityOnOrder: part.quantityOnOrder,
          minimumStockQuantity: Number(part.minimumStockQuantity ?? 1),
          active: part.active,
          quantity: 0,
          plans: [],
        };
        current.quantity = addStockQuantities(current.quantity, part.quantity);
        current.plans.push({
          maintenanceUuid: task.uuid,
          title: task.title,
          material: task.material,
          nextMaintenanceDate: task.nextMaintenanceDate,
          wearBased: task.status === 'wearBased',
          quantity: Number(part.quantity),
        });
        grouped.set(part.uuid, current);
      }
    }
    for (const item of lowStockParts) {
      const part = typeof item?.toJSON === 'function' ? item.toJSON() : item;
      const current = grouped.get(part.uuid) ?? {
        uuid: part.uuid,
        name: part.name,
        manufacturer: part.manufacturer,
        manufacturerUuid: part.manufacturerDirectory?.uuid ?? null,
        supplier: part.supplier,
        supplierUuid: part.supplierDirectory?.uuid ?? null,
        reference: part.reference,
        supplierReference: part.supplierReference,
        unit: part.unit,
        unitPrice: Number(part.unitPrice ?? 0),
        quantityOnHand: Number(part.quantityOnHand ?? 0),
        quantityOnOrder: Number(part.quantityOnOrder ?? 0),
        minimumStockQuantity: Number(part.minimumStockQuantity ?? 1),
        active: part.active,
        quantity: 0,
        plans: [],
      };
      current.lowStock = true;
      current.quantity = Math.max(current.quantity, current.minimumStockQuantity);
      grouped.set(part.uuid, current);
    }
    const items = [...grouped.values()]
      .map((part) => {
        const availability = getStockAvailability(part, part.quantity);
        return {
          ...part,
          stockStatus: availability.status,
          stockQuantity: addStockQuantities(
            availability.quantityOnHand,
            availability.quantityOnOrder,
          ),
          quantity: availability.shortage,
          lowStock: Boolean(part.lowStock),
        };
      })
      .filter((part) => (lowStockOnlyFilter ? part.lowStock : part.quantity > 0))
      .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
    return {
      horizonDays: normalizedHorizon,
      includeOverdue: normalizedIncludeOverdue,
      includeWearBased: includeWearBasedPlans,
      includeLowStock: includeLowStockParts,
      lowStockOnly: lowStockOnlyFilter,
      status: lowStockOnlyFilter ? null : (normalizedStatus ?? null),
      from: today,
      through,
      items,
    };
  }
  async resolveOperation(uuid, transaction) {
    const operation = await this.catalogRepository.findOperationByUuid(uuid, { transaction });
    if (!operation || !operation.active) {
      throw new AppError(
        'L’opération de maintenance sélectionnée est introuvable ou inactive.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    return operation;
  }
  async resolveParts(parts, transaction) {
    if (!Array.isArray(parts)) {
      throw new AppError('La liste des pièces est invalide.', HTTP_STATUS.BAD_REQUEST);
    }
    const uniqueUuids = [...new Set(parts.map(({ partUuid }) => partUuid))];
    if (uniqueUuids.length !== parts.length) {
      throw new AppError('Une pièce ne peut apparaître qu’une fois.', HTTP_STATUS.BAD_REQUEST);
    }
    if (!parts.length) return [];
    if (parts.some(({ quantity }) => !isValidStockQuantity(quantity, { maximum: 100000 }))) {
      throw new AppError('Les quantités de pièces sont invalides.', HTTP_STATUS.BAD_REQUEST);
    }
    const entities = await this.catalogRepository.findPartsByUuids(uniqueUuids, { transaction });
    if (entities.length !== uniqueUuids.length) {
      throw new AppError(
        'Une ou plusieurs pièces sont introuvables ou inactives.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const byUuid = new Map(entities.map((part) => [part.uuid, part]));
    return parts.map(({ partUuid, quantity }) => ({
      partId: byUuid.get(partUuid).id,
      quantity: Number(quantity),
    }));
  }
  toPublic(task) {
    const value = typeof task.toJSON === 'function' ? task.toJSON() : task;
    const publicValue = { ...value };
    delete publicValue.id;
    delete publicValue.materialId;
    delete publicValue.operationId;
    delete publicValue.createdBy;
    delete publicValue.updatedBy;
    return {
      ...publicValue,
      material: value.material
        ? {
            uuid: value.material.uuid,
            name: value.material.name,
          }
        : null,
      operation: value.operation
        ? {
            uuid: value.operation.uuid,
            name: value.operation.name,
            description: value.operation.description,
            maintenanceType: value.operation.maintenanceType,
          }
        : null,
      parts: (value.parts ?? []).map((part) => {
        const quantity = Number(part.MaintenanceTaskPart?.quantity ?? part.quantity ?? 1);
        const availability = getStockAvailability(part, quantity);
        return {
          uuid: part.uuid,
          name: part.name,
          manufacturer: part.manufacturer,
          manufacturerUuid: part.manufacturerDirectory?.uuid ?? null,
          supplier: part.supplier,
          supplierUuid: part.supplierDirectory?.uuid ?? null,
          reference: part.reference,
          supplierReference: part.supplierReference,
          unit: part.unit,
          unitPrice: Number(part.unitPrice ?? 0),
          active: part.active,
          quantityOnHand: availability.quantityOnHand,
          quantityOnOrder: availability.quantityOnOrder,
          minimumStockQuantity: Number(part.minimumStockQuantity ?? 1),
          stockStatus: availability.status,
          stockQuantity: addStockQuantities(
            availability.quantityOnHand,
            availability.quantityOnOrder,
          ),
          quantity,
        };
      }),
      ...getDeadlineDetails(publicValue),
    };
  }
  toHistory(history) {
    const value = typeof history.toJSON === 'function' ? history.toJSON() : history;
    const publicValue = { ...value };
    delete publicValue.id;
    delete publicValue.maintenanceTaskId;
    delete publicValue.performedBy;
    return {
      ...publicValue,
      performedByUser: value.performedByUser
        ? {
            uuid: value.performedByUser.uuid,
            firstName: value.performedByUser.firstName,
            lastName: value.performedByUser.lastName,
          }
        : null,
    };
  }
  toIntervention(intervention) {
    const value = typeof intervention.toJSON === 'function' ? intervention.toJSON() : intervention;
    const parts = (value.partUsages ?? []).map((usage) => ({
      uuid: usage.uuid,
      partUuid: usage.partUuid,
      name: usage.partName,
      reference: usage.partReference,
      unit: usage.unit,
      quantity: Number(usage.quantity),
      unitPrice: Number(usage.unitPrice),
      totalCost: Number(usage.totalCost),
    }));
    return {
      uuid: value.uuid,
      material: value.material ? { uuid: value.material.uuid, name: value.material.name } : null,
      description: value.description,
      performedAt: value.performedAt,
      performedByUser: value.performedByUser
        ? {
            uuid: value.performedByUser.uuid,
            firstName: value.performedByUser.firstName,
            lastName: value.performedByUser.lastName,
          }
        : null,
      parts,
      totalCost: parts.reduce((sum, usage) => sum + usage.totalCost, 0),
      createdAt: value.createdAt,
    };
  }
}
