import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import MaterialService from '../../materials/service/material.service.js';
import MaintenanceCatalogRepository from '../repository/maintenance-catalog.repository.js';
import MaintenanceRepository from '../repository/maintenance.repository.js';
import {
  addDaysDateOnly,
  getDeadlineDetails,
  parseDateOnly,
  todayDateOnly,
} from './maintenance-deadline.service.js';

const has = (object, key) => Object.hasOwn(object, key);

/** Calculates maintenance deadlines and records completed maintenance. */
export default class MaintenanceService {
  constructor(
    repository = new MaintenanceRepository(),
    materialService = new MaterialService(),
    auditService = new AuditService(),
    catalogRepository = new MaintenanceCatalogRepository(),
  ) {
    this.repository = repository;
    this.materialService = materialService;
    this.auditService = auditService;
    this.catalogRepository = catalogRepository;
  }
  async getAll(query) {
    const result = await this.repository.findAll(query);
    const showAll = query.limit === 'all';
    const limit = showAll ? Math.max(result.count, 1) : Math.min(Number(query.limit) || 5, 100);
    const page = showAll ? 1 : Math.max(Number(query.page) || 1, 1);
    return {
      items: result.rows.map((task) => this.toPublic(task)),
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages: showAll ? 1 : Math.max(Math.ceil(result.count / limit), 1),
      },
    };
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
    if (!Number(intervalDays))
      throw new AppError('Un intervalle en jours doit être renseigné.', HTTP_STATUS.BAD_REQUEST);
    const lastMaintenanceDate = has(values, 'lastMaintenanceDate')
      ? values.lastMaintenanceDate
      : current.lastMaintenanceDate;
    if (!lastMaintenanceDate)
      throw new AppError(
        'La date du dernier entretien est requise pour un intervalle en jours.',
        HTTP_STATUS.BAD_REQUEST,
      );
    return {
      nextMaintenanceDate: addDaysDateOnly(lastMaintenanceDate, intervalDays),
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
      return created;
    });
    await this.auditService.record({
      userId,
      action: 'CREATE',
      entity: 'MAINTENANCE_TASK',
      entityUuid: task.uuid,
      newValues: task.toJSON(),
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
    });
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'MAINTENANCE_TASK',
      entityUuid: task.uuid,
      oldValues,
      newValues: task.toJSON(),
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
    });
    await this.auditService.record({
      userId,
      action: 'STATUS_CHANGE',
      entity: 'MAINTENANCE_TASK',
      entityUuid: task.uuid,
      oldValues,
      newValues: task.toJSON(),
    });
    return this.toPublic(task);
  }
  async remove(uuid, userId) {
    const task = await this.getEntityByUuid(uuid);
    const oldValues = task.toJSON();
    await this.repository.remove(task);
    await this.auditService.record({
      userId,
      action: 'DELETE',
      entity: 'MAINTENANCE_TASK',
      entityUuid: task.uuid,
      oldValues,
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
          performedBy: userId,
        },
        { transaction },
      );
      return { task, history, oldValues };
    });
    await this.auditService.record({
      userId,
      action: 'EXECUTE',
      entity: 'MAINTENANCE_TASK',
      entityUuid: result.task.uuid,
      oldValues: result.oldValues,
      newValues: result.task.toJSON(),
    });
    return { task: this.toPublic(result.task), history: this.toHistory(result.history) };
  }
  async getHistory(uuid) {
    const task = await this.getEntityByUuid(uuid);
    return (await this.repository.findHistory(task.id)).map((history) => this.toHistory(history));
  }
  async getOrderList({ horizonDays = 30, includeOverdue = true } = {}) {
    const normalizedHorizon = Math.min(Math.max(Number(horizonDays) || 0, 0), 365);
    const today = todayDateOnly();
    const through = addDaysDateOnly(today, normalizedHorizon);
    const tasks = await this.repository.findForOrderList({
      from: includeOverdue === false ? today : undefined,
      through,
    });
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
          quantity: 0,
          plans: [],
        };
        current.quantity += Number(part.quantity);
        current.plans.push({
          maintenanceUuid: task.uuid,
          title: task.title,
          material: task.material,
          nextMaintenanceDate: task.nextMaintenanceDate,
          quantity: Number(part.quantity),
        });
        grouped.set(part.uuid, current);
      }
    }
    return {
      horizonDays: normalizedHorizon,
      includeOverdue: includeOverdue !== false,
      from: today,
      through,
      items: [...grouped.values()].sort((left, right) => left.name.localeCompare(right.name, 'fr')),
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
    if (parts.some(({ quantity }) => !Number.isInteger(Number(quantity)) || Number(quantity) < 1)) {
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
      parts: (value.parts ?? []).map((part) => ({
        uuid: part.uuid,
        name: part.name,
        manufacturer: part.manufacturer,
        manufacturerUuid: part.manufacturerDirectory?.uuid ?? null,
        supplier: part.supplier,
        supplierUuid: part.supplierDirectory?.uuid ?? null,
        reference: part.reference,
        supplierReference: part.supplierReference,
        unit: part.unit,
        active: part.active,
        quantity: Number(part.MaintenanceTaskPart?.quantity ?? part.quantity ?? 1),
      })),
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
}
