import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import MaterialService from '../../materials/service/material.service.js';
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
  ) {
    this.repository = repository;
    this.materialService = materialService;
    this.auditService = auditService;
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
    const material = await this.materialService.getEntityByUuid(values.materialUuid);
    const deadlines = this.calculateDeadlines(values);
    const task = await this.repository.create({
      ...values,
      ...deadlines,
      materialId: material.id,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditService.record({
      userId,
      action: 'CREATE',
      entity: 'MAINTENANCE_TASK',
      entityUuid: task.uuid,
      newValues: task.toJSON(),
    });
    return this.toPublic(task);
  }
  async update(uuid, values, userId) {
    const task = await this.getEntityByUuid(uuid);
    const oldValues = task.toJSON();
    const deadlines = this.calculateDeadlines(values, task);
    await this.repository.update(task, { ...values, ...deadlines, updatedBy: userId });
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'MAINTENANCE_TASK',
      entityUuid: task.uuid,
      oldValues,
      newValues: task.toJSON(),
    });
    return this.toPublic(task);
  }
  async changeStatus(uuid, active, userId) {
    const task = await this.getEntityByUuid(uuid);
    const oldValues = task.toJSON();
    await this.repository.update(task, { active, updatedBy: userId });
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
  toPublic(task) {
    const value = typeof task.toJSON === 'function' ? task.toJSON() : task;
    const publicValue = { ...value };
    delete publicValue.id;
    delete publicValue.materialId;
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
