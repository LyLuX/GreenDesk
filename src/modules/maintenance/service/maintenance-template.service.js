import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import MaterialService from '../../materials/service/material.service.js';
import MaintenanceTemplateRepository from '../repository/maintenance-template.repository.js';
import { addDaysDateOnly } from './maintenance-deadline.service.js';

export default class MaintenanceTemplateService {
  constructor(
    repository = new MaintenanceTemplateRepository(),
    materialService = new MaterialService(),
    auditService = new AuditService(),
  ) {
    this.repository = repository;
    this.materialService = materialService;
    this.auditService = auditService;
  }

  async getAll(query = {}) {
    return (await this.repository.findAll(query)).map((template) => this.toPublic(template));
  }

  async getByUuid(uuid) {
    return this.toPublic(await this.getEntityByUuid(uuid));
  }

  async getEntityByUuid(uuid) {
    const template = await this.repository.findByUuid(uuid);
    if (!template) throw new AppError('Modèle d’entretien introuvable.', HTTP_STATUS.NOT_FOUND);
    return template;
  }

  async getMaterialScope(materialUuid) {
    const material = await this.materialService.getEntityByUuid(materialUuid);
    if (!material.brandId || !material.model)
      throw new AppError(
        'Le matériel doit posséder une marque et un modèle pour définir un modèle d’entretien.',
        HTTP_STATUS.BAD_REQUEST,
      );
    return material;
  }

  async ensureUnique(values, excludeUuid) {
    const duplicate = await this.repository.findDuplicate(values, excludeUuid);
    if (duplicate)
      throw new AppError(
        'Un modèle d’entretien portant cet intitulé existe déjà pour cette marque et ce modèle.',
        HTTP_STATUS.CONFLICT,
      );
  }

  async create(values, userId) {
    const material = await this.getMaterialScope(values.materialUuid);
    const definition = {
      ...values,
      brandId: material.brandId,
      materialModel: material.model,
    };
    delete definition.materialUuid;
    const existing = await this.repository.findDuplicate(definition);
    if (existing && !existing.deletedAt)
      throw new AppError(
        'Un modèle d’entretien portant cet intitulé existe déjà pour cette marque et ce modèle.',
        HTTP_STATUS.CONFLICT,
      );
    if (existing) {
      const oldValues = existing.toJSON();
      await this.repository.restore(existing);
      await this.repository.update(existing, {
        ...definition,
        active: true,
        updatedBy: userId,
      });
      await this.auditService.record({
        userId,
        action: 'RESTORE',
        entity: 'MAINTENANCE_TEMPLATE',
        entityUuid: existing.uuid,
        oldValues,
        newValues: existing.toJSON(),
      });
      return this.getByUuid(existing.uuid);
    }
    const template = await this.repository.create({
      ...definition,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditService.record({
      userId,
      action: 'CREATE',
      entity: 'MAINTENANCE_TEMPLATE',
      entityUuid: template.uuid,
      newValues: template.toJSON(),
    });
    return this.getByUuid(template.uuid);
  }

  async update(uuid, values, userId) {
    const template = await this.getEntityByUuid(uuid);
    const oldValues = template.toJSON();
    const update = { ...values };
    if (update.materialUuid) {
      const material = await this.getMaterialScope(update.materialUuid);
      if (
        (Number(material.brandId) !== Number(template.brandId) ||
          material.model !== template.materialModel) &&
        (await this.repository.countAssignments(template.id))
      )
        throw new AppError(
          'La compatibilité d’un modèle déjà affecté ne peut pas être modifiée.',
          HTTP_STATUS.CONFLICT,
        );
      update.brandId = material.brandId;
      update.materialModel = material.model;
      delete update.materialUuid;
    }
    await this.ensureUnique(
      {
        brandId: update.brandId ?? template.brandId,
        materialModel: update.materialModel ?? template.materialModel,
        title: update.title ?? template.title,
      },
      template.uuid,
    );
    await this.repository.withTransaction(async (transaction) => {
      await this.repository.update(template, { ...update, updatedBy: userId }, { transaction });
      if (update.intervalDays && Number(update.intervalDays) !== Number(oldValues.intervalDays))
        await this.repository.updateAssignmentDeadlines(
          template.id,
          (lastMaintenanceDate) => addDaysDateOnly(lastMaintenanceDate, update.intervalDays),
          { transaction },
        );
    });
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'MAINTENANCE_TEMPLATE',
      entityUuid: template.uuid,
      oldValues,
      newValues: template.toJSON(),
    });
    return this.getByUuid(template.uuid);
  }

  async remove(uuid, userId) {
    const template = await this.getEntityByUuid(uuid);
    if (await this.repository.countAssignments(template.id))
      throw new AppError(
        'Ce modèle est utilisé par un plan et ne peut pas être supprimé.',
        HTTP_STATUS.CONFLICT,
      );
    await this.repository.remove(template);
    await this.auditService.record({
      userId,
      action: 'DELETE',
      entity: 'MAINTENANCE_TEMPLATE',
      entityUuid: template.uuid,
      oldValues: template.toJSON(),
    });
  }

  isCompatible(template, material) {
    return (
      Number(template.brandId) === Number(material.brandId) &&
      String(template.materialModel).trim().toLocaleLowerCase('fr-FR') ===
        String(material.model ?? '')
          .trim()
          .toLocaleLowerCase('fr-FR')
    );
  }

  toPublic(template) {
    const value = typeof template.toJSON === 'function' ? template.toJSON() : template;
    const publicValue = { ...value };
    delete publicValue.id;
    delete publicValue.brandId;
    delete publicValue.brand_id;
    delete publicValue.createdBy;
    delete publicValue.updatedBy;
    return {
      ...publicValue,
      brand: value.brand
        ? {
            uuid: value.brand.uuid,
            name: value.brand.name,
          }
        : null,
    };
  }
}
