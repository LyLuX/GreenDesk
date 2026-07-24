import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import BrandRepository from '../repository/brand.repository.js';
export default class BrandService {
  constructor(repository = new BrandRepository(), auditService = new AuditService()) {
    this.repository = repository;
    this.auditService = auditService;
  }
  async getAll(search) {
    return (await this.repository.findAll(search)).map((item) => this.toPublic(item));
  }
  async getByUuid(uuid) {
    return this.toPublic(await this.getEntityByUuid(uuid));
  }
  async getEntityByUuid(uuid) {
    const item = await this.repository.findByUuid(uuid);
    if (!item) throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    return item;
  }
  async create(values, userId) {
    const existingBrand = await this.repository.findByName(values.name, { withDeleted: true });
    if (existingBrand && !existingBrand.deletedAt)
      throw new AppError('Brand name is already in use', HTTP_STATUS.CONFLICT);
    if (existingBrand) {
      const oldValues = existingBrand.toJSON();
      await this.repository.restore(existingBrand);
      const brand = await this.repository.update(existingBrand, {
        ...values,
        active: true,
        updatedBy: userId,
      });
      await this.auditService.record({
        userId,
        action: 'RESTORE',
        entity: 'BRAND',
        entityUuid: brand.uuid,
        oldValues,
        newValues: brand.toJSON(),
      });
      return this.toPublic(brand);
    }
    return this.toPublic(
      await this.repository.create({ ...values, createdBy: userId, updatedBy: userId }),
    );
  }
  async update(uuid, values, userId) {
    const item = await this.getEntityByUuid(uuid);
    await this.repository.update(item, { ...values, updatedBy: userId });
    return this.toPublic(item);
  }
  async remove(uuid, userId) {
    const item = await this.getEntityByUuid(uuid);
    await this.repository.delete(item);
    await this.auditService.record({
      userId,
      action: 'DELETE',
      entity: 'BRAND',
      entityUuid: item.uuid,
      oldValues: item.toJSON(),
    });
  }
  toPublic(item) {
    const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
    const publicValue = { ...value, hasLogo: Boolean(value.logoFileName) };
    delete publicValue.id;
    delete publicValue.logoFileName;
    delete publicValue.logoOriginalName;
    delete publicValue.logoMimeType;
    delete publicValue.createdBy;
    delete publicValue.updatedBy;
    return publicValue;
  }
}
