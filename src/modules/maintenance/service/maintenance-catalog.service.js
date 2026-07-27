import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import MaintenanceCatalogRepository from '../repository/maintenance-catalog.repository.js';

/** Reusable operation and exact-part catalogue lifecycle. */
export default class MaintenanceCatalogService {
  constructor(repository = new MaintenanceCatalogRepository(), auditService = new AuditService()) {
    this.repository = repository;
    this.auditService = auditService;
  }

  async getOperations() {
    return (await this.repository.findOperations()).map((item) => this.toPublic(item));
  }

  async getOperationEntity(uuid, options) {
    const operation = await this.repository.findOperationByUuid(uuid, options);
    if (!operation)
      throw new AppError('Opération de maintenance introuvable.', HTTP_STATUS.NOT_FOUND);
    return operation;
  }

  async createOperation(values, userId) {
    const existing = await this.repository.findOperationByName(values.name, {
      withDeleted: true,
    });
    if (existing && !existing.deletedAt)
      throw new AppError('Cette opération existe déjà.', HTTP_STATUS.CONFLICT);

    const operation = await this.repository.withTransaction(async (transaction) => {
      if (existing) {
        await this.repository.restoreOperation(existing, { transaction });
        return this.repository.updateOperation(
          existing,
          { ...values, active: true, updatedBy: userId },
          { transaction },
        );
      }
      return this.repository.createOperation(
        { ...values, createdBy: userId, updatedBy: userId },
        { transaction },
      );
    });
    await this.record(userId, existing ? 'RESTORE' : 'CREATE', 'MAINTENANCE_OPERATION', operation);
    return this.toPublic(operation);
  }

  async updateOperation(uuid, values, userId) {
    const operation = await this.getOperationEntity(uuid);
    if (values.name && values.name !== operation.name) {
      const duplicate = await this.repository.findOperationByName(values.name);
      if (duplicate) throw new AppError('Cette opération existe déjà.', HTTP_STATUS.CONFLICT);
    }
    const oldValues = this.toPublic(operation);
    await this.repository.withTransaction(async (transaction) => {
      await this.repository.updateOperation(
        operation,
        { ...values, updatedBy: userId },
        { transaction },
      );
      if (values.name || values.maintenanceType) {
        await this.repository.updateTasksForOperation(
          operation.id,
          {
            title: operation.name,
            maintenanceType: operation.maintenanceType,
          },
          { transaction },
        );
      }
    });
    await this.record(userId, 'UPDATE', 'MAINTENANCE_OPERATION', operation, oldValues);
    return this.toPublic(operation);
  }

  async removeOperation(uuid, userId) {
    const operation = await this.getOperationEntity(uuid);
    if (await this.repository.countTasksForOperation(operation.id)) {
      throw new AppError('Cette opération est encore utilisée par un plan.', HTTP_STATUS.CONFLICT);
    }
    const oldValues = this.toPublic(operation);
    await this.repository.removeOperation(operation);
    await this.record(userId, 'DELETE', 'MAINTENANCE_OPERATION', operation, oldValues);
  }

  async getParts() {
    return (await this.repository.findParts()).map((item) => this.toPublic(item));
  }

  async getPartEntity(uuid, options) {
    const part = await this.repository.findPartByUuid(uuid, options);
    if (!part) throw new AppError('Pièce introuvable.', HTTP_STATUS.NOT_FOUND);
    return part;
  }

  async createPart(values, userId) {
    const existing = await this.repository.findPartByIdentity(
      values.reference,
      values.manufacturer,
      { withDeleted: true },
    );
    if (existing && !existing.deletedAt)
      throw new AppError('Cette référence existe déjà pour ce fabricant.', HTTP_STATUS.CONFLICT);

    const part = await this.repository.withTransaction(async (transaction) => {
      if (existing) {
        await this.repository.restorePart(existing, { transaction });
        return this.repository.updatePart(
          existing,
          { ...values, active: true, updatedBy: userId },
          { transaction },
        );
      }
      return this.repository.createPart(
        { ...values, createdBy: userId, updatedBy: userId },
        { transaction },
      );
    });
    await this.record(userId, existing ? 'RESTORE' : 'CREATE', 'MAINTENANCE_PART', part);
    return this.toPublic(part);
  }

  async updatePart(uuid, values, userId) {
    const part = await this.getPartEntity(uuid);
    const nextReference = values.reference ?? part.reference;
    const nextManufacturer = Object.hasOwn(values, 'manufacturer')
      ? values.manufacturer
      : part.manufacturer;
    if (nextReference !== part.reference || nextManufacturer !== part.manufacturer) {
      const duplicate = await this.repository.findPartByIdentity(nextReference, nextManufacturer);
      if (duplicate && duplicate.uuid !== part.uuid) {
        throw new AppError('Cette référence existe déjà pour ce fabricant.', HTTP_STATUS.CONFLICT);
      }
    }
    const oldValues = this.toPublic(part);
    await this.repository.updatePart(part, { ...values, updatedBy: userId });
    await this.record(userId, 'UPDATE', 'MAINTENANCE_PART', part, oldValues);
    return this.toPublic(part);
  }

  async removePart(uuid, userId) {
    const part = await this.getPartEntity(uuid);
    if (await this.repository.countTasksForPart(part.id)) {
      throw new AppError('Cette pièce est encore utilisée par un plan.', HTTP_STATUS.CONFLICT);
    }
    const oldValues = this.toPublic(part);
    await this.repository.removePart(part);
    await this.record(userId, 'DELETE', 'MAINTENANCE_PART', part, oldValues);
  }

  toPublic(item) {
    const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
    const publicValue = { ...value };
    delete publicValue.id;
    delete publicValue.createdBy;
    delete publicValue.updatedBy;
    return publicValue;
  }

  record(userId, action, entity, item, oldValues) {
    return this.auditService.record({
      userId,
      action,
      entity,
      entityUuid: item.uuid,
      ...(oldValues ? { oldValues } : {}),
      ...(action !== 'DELETE' ? { newValues: this.toPublic(item) } : {}),
    });
  }
}
