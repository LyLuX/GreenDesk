import MaterialRepository from '../../../core/database/repositories/material.repository.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';

/** Business lifecycle for materials. */
export default class MaterialService {
  constructor(materialRepository = new MaterialRepository(), auditService = new AuditService()) {
    this.materialRepository = materialRepository;
    this.auditService = auditService;
  }
  async getAll(search) {
    return this.materialRepository.findAll(search);
  }
  async getByUuid(uuid) {
    const item = await this.materialRepository.findByUuid(uuid);
    if (!item) throw new AppError('Material not found', HTTP_STATUS.NOT_FOUND);
    return item;
  }
  async create(values, userId) {
    await this.ensureAvailable(values);
    const item = await this.materialRepository.create({
      ...values,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditService.record({
      userId,
      action: 'CREATE',
      entity: 'MATERIAL',
      entityUuid: item.uuid,
      newValues: item.toJSON(),
    });
    return item;
  }
  async update(uuid, values, userId) {
    const item = await this.getByUuid(uuid);
    const oldValues = item.toJSON();
    if (
      (values.name && values.name !== item.name) ||
      (values.reference && values.reference !== item.reference)
    )
      await this.ensureAvailable(values);
    await this.materialRepository.update(item, { ...values, updatedBy: userId });
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'MATERIAL',
      entityUuid: item.uuid,
      oldValues,
      newValues: item.toJSON(),
    });
    return item;
  }
  async changeStatus(uuid, active, userId) {
    const item = await this.getByUuid(uuid);
    const oldValues = item.toJSON();
    await this.materialRepository.update(item, { active, updatedBy: userId });
    await this.auditService.record({
      userId,
      action: 'STATUS_CHANGE',
      entity: 'MATERIAL',
      entityUuid: item.uuid,
      oldValues,
      newValues: item.toJSON(),
    });
    return item;
  }
  async ensureAvailable(values) {
    if (values.name && (await this.materialRepository.findByName(values.name)))
      throw new AppError('Material name is already in use', HTTP_STATUS.CONFLICT);
    if (values.reference && (await this.materialRepository.findByReference(values.reference)))
      throw new AppError('Material reference is already in use', HTTP_STATUS.CONFLICT);
  }
}
