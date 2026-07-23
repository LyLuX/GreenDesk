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
    const limit = Math.min(Number(query.limit) || 25, 100);
    const page = Math.max(Number(query.page) || 1, 1);
    return {
      items: result.rows.map((task) => this.toPublic(task)),
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages: Math.max(Math.ceil(result.count / limit), 1),
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
    const intervalHours = has(values, 'intervalHours')
      ? values.intervalHours
      : current.intervalHours;
    if (!Number(intervalDays) && !Number(intervalHours))
      throw new AppError('Au moins un intervalle doit être renseigné.', HTTP_STATUS.BAD_REQUEST);
    const lastMaintenanceDate = has(values, 'lastMaintenanceDate')
      ? values.lastMaintenanceDate
      : current.lastMaintenanceDate;
    const lastEngineHours = has(values, 'lastEngineHours')
      ? values.lastEngineHours
      : current.lastEngineHours;
    if (Number(intervalDays) && !lastMaintenanceDate)
      throw new AppError(
        'La date du dernier entretien est requise pour un intervalle en jours.',
        HTTP_STATUS.BAD_REQUEST,
      );
    if (Number(intervalHours) && (lastEngineHours === null || lastEngineHours === undefined))
      throw new AppError(
        'Les heures du dernier entretien sont requises pour un intervalle en heures.',
        HTTP_STATUS.BAD_REQUEST,
      );
    const result = {};
    if (Number(intervalDays)) {
      result.nextMaintenanceDate = addDaysDateOnly(lastMaintenanceDate, intervalDays);
    } else result.nextMaintenanceDate = null;
    if (Number(intervalHours))
      result.nextEngineHours = Number(lastEngineHours) + Number(intervalHours);
    else result.nextEngineHours = null;
    return result;
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
      const isHourly = Number(task.intervalHours) > 0;
      if (isHourly && (values.engineHours === null || values.engineHours === undefined))
        throw new AppError(
          'Les heures moteur sont obligatoires pour ce plan.',
          HTTP_STATUS.BAD_REQUEST,
        );
      const engineHours = values.engineHours ?? task.lastEngineHours;
      if (engineHours !== null && engineHours !== undefined) {
        if (Number(engineHours) < 0)
          throw new AppError('Les heures moteur doivent être positives.', HTTP_STATUS.BAD_REQUEST);
        if (task.lastEngineHours !== null && Number(engineHours) < Number(task.lastEngineHours))
          throw new AppError(
            'Les heures moteur ne peuvent pas reculer par rapport au dernier entretien.',
            HTTP_STATUS.BAD_REQUEST,
          );
        if (
          task.material?.engineHours !== null &&
          task.material?.engineHours !== undefined &&
          Number(engineHours) < Number(task.material.engineHours)
        )
          throw new AppError(
            'Les heures moteur ne peuvent pas être inférieures au compteur matériel.',
            HTTP_STATUS.BAD_REQUEST,
          );
      }
      const update = {
        lastMaintenanceDate: performedAt,
        lastEngineHours: engineHours,
        updatedBy: userId,
      };
      const deadlines = this.calculateDeadlines(update, task);
      await this.repository.update(task, { ...update, ...deadlines }, { transaction });
      if (task.material && Number(engineHours) > Number(task.material.engineHours ?? 0))
        await task.material.update({ engineHours }, { transaction });
      const history = await this.repository.createHistory(
        {
          maintenanceTaskId: task.id,
          performedAt,
          engineHours: engineHours ?? null,
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
            engineHours: value.material.engineHours,
          }
        : null,
      ...getDeadlineDetails({ ...publicValue, materialEngineHours: value.material?.engineHours }),
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
