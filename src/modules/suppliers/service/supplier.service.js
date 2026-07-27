import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import SupplierRepository from '../repository/supplier.repository.js';

/** Global supplier lifecycle shared by maintenance parts and future purchasing modules. */
export default class SupplierService {
  constructor(repository = new SupplierRepository(), auditService = new AuditService()) {
    this.repository = repository;
    this.auditService = auditService;
  }
  async getAll(search) {
    return (await this.repository.findAll(search)).map((item) => this.toPublic(item));
  }
  async getByUuid(uuid) {
    return this.toPublic(await this.getEntityByUuid(uuid));
  }
  async getEntityByUuid(uuid, { allowInactive = true, ...options } = {}) {
    const item = await this.repository.findByUuid(uuid, options);
    if (!item || (!allowInactive && !item.active)) {
      throw new AppError('Fournisseur introuvable ou inactif.', HTTP_STATUS.NOT_FOUND);
    }
    return item;
  }
  async create(values, userId) {
    const existing = await this.repository.findByName(values.name, { withDeleted: true });
    if (existing && !existing.deletedAt) {
      throw new AppError('Ce fournisseur existe déjà.', HTTP_STATUS.CONFLICT);
    }
    const item = await this.repository.withTransaction(async (transaction) => {
      if (existing) {
        await this.repository.restore(existing, { transaction });
        return this.repository.update(
          existing,
          { ...values, active: true, updatedBy: userId },
          { transaction },
        );
      }
      return this.repository.create(
        { ...values, createdBy: userId, updatedBy: userId },
        { transaction },
      );
    });
    await this.auditService.record({
      userId,
      action: existing ? 'RESTORE' : 'CREATE',
      entity: 'SUPPLIER',
      entityUuid: item.uuid,
      newValues: item.toJSON(),
    });
    return this.toPublic(item);
  }
  async update(uuid, values, userId) {
    const item = await this.getEntityByUuid(uuid);
    if (values.name) {
      const duplicate = await this.repository.findByName(values.name);
      if (duplicate && duplicate.uuid !== item.uuid) {
        throw new AppError('Ce fournisseur existe déjà.', HTTP_STATUS.CONFLICT);
      }
    }
    const oldValues = item.toJSON();
    await this.repository.withTransaction(async (transaction) => {
      await this.repository.update(item, { ...values, updatedBy: userId }, { transaction });
      if (values.name) {
        await this.repository.updatePartNames(item.id, item.name, { transaction });
      }
    });
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'SUPPLIER',
      entityUuid: item.uuid,
      oldValues,
      newValues: item.toJSON(),
    });
    return this.toPublic(item);
  }
  async remove(uuid, userId) {
    const item = await this.getEntityByUuid(uuid);
    if (await this.repository.countParts(item.id)) {
      throw new AppError('Ce fournisseur est encore utilisé par une pièce.', HTTP_STATUS.CONFLICT);
    }
    const oldValues = item.toJSON();
    await this.repository.delete(item);
    await this.auditService.record({
      userId,
      action: 'DELETE',
      entity: 'SUPPLIER',
      entityUuid: item.uuid,
      oldValues,
    });
  }
  toPublic(item) {
    const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
    const publicValue = { ...value };
    delete publicValue.id;
    delete publicValue.createdBy;
    delete publicValue.updatedBy;
    return publicValue;
  }
}
