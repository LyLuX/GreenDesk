import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import MaterialService from '../../materials/service/material.service.js';
import MaintenanceRepository from '../repository/maintenance.repository.js';
import MaintenanceTemplateService from './maintenance-template.service.js';
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
    templateService = new MaintenanceTemplateService(),
  ) {
    this.repository = repository;
    this.materialService = materialService;
    this.auditService = auditService;
    this.templateService = templateService;
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
    const intervalDays = has(values, 'intervalDays')
      ? values.intervalDays
      : (current.intervalDays ?? current.template?.intervalDays);
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
    const template = await this.templateService.getEntityByUuid(values.templateUuid);
    if (!template.active)
      throw new AppError('Ce modèle d’entretien est inactif.', HTTP_STATUS.BAD_REQUEST);
    if (!this.templateService.isCompatible(template, material))
      throw new AppError(
        'Ce modèle d’entretien n’est pas compatible avec la marque et le modèle du matériel.',
        HTTP_STATUS.BAD_REQUEST,
      );
    const existingTask = await this.repository.findByMaterialAndTemplate(material.id, template.id);
    if (existingTask && !existingTask.deletedAt)
      throw new AppError('Ce modèle est déjà affecté à ce matériel.', HTTP_STATUS.CONFLICT);
    const deadlines = this.calculateDeadlines(values, template);
    if (existingTask) {
      const oldValues = existingTask.toJSON();
      await this.repository.restore(existingTask);
      await this.repository.update(existingTask, {
        lastMaintenanceDate: values.lastMaintenanceDate,
        notes: values.notes ?? null,
        ...deadlines,
        active: true,
        updatedBy: userId,
      });
      await this.auditService.record({
        userId,
        action: 'RESTORE',
        entity: 'MAINTENANCE_TASK',
        entityUuid: existingTask.uuid,
        oldValues,
        newValues: existingTask.toJSON(),
      });
      return this.getByUuid(existingTask.uuid);
    }
    const task = await this.repository.create({
      lastMaintenanceDate: values.lastMaintenanceDate,
      notes: values.notes ?? null,
      ...deadlines,
      materialId: material.id,
      templateId: template.id,
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
    return this.getByUuid(task.uuid);
  }
  async update(uuid, values, userId) {
    const task = await this.getEntityByUuid(uuid);
    const oldValues = task.toJSON();
    const material = values.materialUuid
      ? await this.materialService.getEntityByUuid(values.materialUuid)
      : task.material;
    const template = values.templateUuid
      ? await this.templateService.getEntityByUuid(values.templateUuid)
      : task.template;
    if (values.templateUuid && !template.active)
      throw new AppError('Ce modèle d’entretien est inactif.', HTTP_STATUS.BAD_REQUEST);
    if (!this.templateService.isCompatible(template, material))
      throw new AppError(
        'Ce modèle d’entretien n’est pas compatible avec la marque et le modèle du matériel.',
        HTTP_STATUS.BAD_REQUEST,
      );
    if (
      await this.repository.findByMaterialAndTemplate(
        material.id ?? task.materialId,
        template.id ?? task.templateId,
        task.uuid,
      )
    )
      throw new AppError('Ce modèle est déjà affecté à ce matériel.', HTTP_STATUS.CONFLICT);
    const update = {
      materialId: material.id ?? task.materialId,
      templateId: template.id ?? task.templateId,
      lastMaintenanceDate: values.lastMaintenanceDate ?? task.lastMaintenanceDate,
      notes: has(values, 'notes') ? values.notes : task.notes,
      updatedBy: userId,
    };
    const deadlines = this.calculateDeadlines(update, template);
    await this.repository.update(task, { ...update, ...deadlines });
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'MAINTENANCE_TASK',
      entityUuid: task.uuid,
      oldValues,
      newValues: task.toJSON(),
    });
    return this.getByUuid(task.uuid);
  }
  async changeStatus(uuid, active, userId) {
    const task = await this.getEntityByUuid(uuid);
    if (active && !task.template?.active)
      throw new AppError(
        'Un plan lié à un modèle d’entretien inactif ne peut pas être activé.',
        HTTP_STATUS.BAD_REQUEST,
      );
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
    delete publicValue.templateId;
    delete publicValue.material_id;
    delete publicValue.template_id;
    delete publicValue.createdBy;
    delete publicValue.updatedBy;
    delete publicValue.material;
    delete publicValue.template;
    const template = value.template ? this.templateService.toPublic(value.template) : null;
    return {
      ...publicValue,
      title: template?.title,
      description: template?.description,
      maintenanceType: template?.maintenanceType,
      intervalDays: template?.intervalDays,
      priority: template?.priority,
      partReference: template?.partReference,
      quantity: template?.quantity,
      instructions: template?.instructions,
      template,
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
