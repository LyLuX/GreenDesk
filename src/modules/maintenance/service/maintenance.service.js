import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import MaterialService, { parseDateOnly } from '../../materials/service/material.service.js';
import MaintenanceRepository from '../repository/maintenance.repository.js';

const dateOnly = (date) => date?.toISOString().slice(0, 10) ?? null;

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
    const intervalDays = values.intervalDays ?? current.intervalDays;
    const intervalHours = values.intervalHours ?? current.intervalHours;
    if (!Number(intervalDays) && !Number(intervalHours))
      throw new AppError('Au moins un intervalle doit être renseigné.', HTTP_STATUS.BAD_REQUEST);
    const lastMaintenanceDate = values.lastMaintenanceDate ?? current.lastMaintenanceDate;
    const lastEngineHours = values.lastEngineHours ?? current.lastEngineHours;
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
      const date = parseDateOnly(lastMaintenanceDate);
      date.setUTCDate(date.getUTCDate() + Number(intervalDays));
      result.nextMaintenanceDate = dateOnly(date);
    }
    if (Number(intervalHours))
      result.nextEngineHours = Number(lastEngineHours) + Number(intervalHours);
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
    await this.repository.update(task, { active, updatedBy: userId });
    return this.toPublic(task);
  }
  async execute(uuid, values, userId) {
    const task = await this.getEntityByUuid(uuid);
    const oldValues = task.toJSON();
    const performedAt = values.performedAt ?? new Date().toISOString().slice(0, 10);
    parseDateOnly(performedAt);
    if (values.engineHours !== undefined && Number(values.engineHours) < 0)
      throw new AppError('Les heures moteur doivent être positives.', HTTP_STATUS.BAD_REQUEST);
    const update = {
      lastMaintenanceDate: performedAt,
      lastEngineHours: values.engineHours ?? task.lastEngineHours,
      updatedBy: userId,
    };
    const deadlines = this.calculateDeadlines(update, task);
    await this.repository.update(task, { ...update, ...deadlines });
    const history = await this.repository.createHistory({
      maintenanceTaskId: task.id,
      performedAt,
      engineHours: values.engineHours ?? null,
      comment: values.comment ?? null,
      performedBy: userId,
    });
    await this.auditService.record({
      userId,
      action: 'EXECUTE',
      entity: 'MAINTENANCE_TASK',
      entityUuid: task.uuid,
      oldValues,
      newValues: task.toJSON(),
    });
    return { task: this.toPublic(task), history: this.toHistory(history) };
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
    const nextDate =
      publicValue.nextMaintenanceDate && parseDateOnly(publicValue.nextMaintenanceDate);
    const isOverdue = Boolean(
      nextDate && nextDate < new Date(new Date().toISOString().slice(0, 10)),
    );
    const isDueSoon = Boolean(
      nextDate && !isOverdue && nextDate <= new Date(Date.now() + 30 * 86400000),
    );
    return {
      ...publicValue,
      material: value.material ? { uuid: value.material.uuid, name: value.material.name } : null,
      status: isOverdue ? 'overdue' : isDueSoon ? 'upcoming' : 'upToDate',
    };
  }
  toHistory(history) {
    const value = typeof history.toJSON === 'function' ? history.toJSON() : history;
    const publicValue = { ...value };
    delete publicValue.id;
    delete publicValue.maintenanceTaskId;
    delete publicValue.performedBy;
    return publicValue;
  }
}
