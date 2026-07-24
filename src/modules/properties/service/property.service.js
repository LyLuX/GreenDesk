import PropertyRepository from '../../../core/database/repositories/property.repository.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';

/** Business lifecycle for custom properties. */
export default class PropertyService {
  constructor(propertyRepository = new PropertyRepository(), auditService = new AuditService()) {
    this.propertyRepository = propertyRepository;
    this.auditService = auditService;
  }
  async getAll(search) {
    return this.propertyRepository.findAll(search);
  }
  async getByUuid(uuid) {
    const item = await this.propertyRepository.findByUuid(uuid);
    if (!item) throw new AppError('Property not found', HTTP_STATUS.NOT_FOUND);
    return item;
  }
  async create(values, userId) {
    await this.ensureName(values.name);
    const item = await this.propertyRepository.create({
      ...values,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditService.record({
      userId,
      action: 'CREATE',
      entity: 'PROPERTY',
      entityUuid: item.uuid,
      newValues: item.toJSON(),
    });
    return item;
  }
  async update(uuid, values, userId) {
    const item = await this.getByUuid(uuid);
    const oldValues = item.toJSON();
    if (values.name && values.name !== item.name) await this.ensureName(values.name);
    await this.propertyRepository.update(item, { ...values, updatedBy: userId });
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'PROPERTY',
      entityUuid: item.uuid,
      oldValues,
      newValues: item.toJSON(),
    });
    return item;
  }
  async remove(uuid, userId) {
    const item = await this.getByUuid(uuid);
    const oldValues = item.toJSON();
    await this.propertyRepository.delete(item);
    await this.auditService.record({
      userId,
      action: 'DELETE',
      entity: 'PROPERTY',
      entityUuid: item.uuid,
      oldValues,
    });
  }
  async ensureName(name) {
    if (await this.propertyRepository.findByName(name))
      throw new AppError('Property name is already in use', HTTP_STATUS.CONFLICT);
  }
}
