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
    return this.repository.findAll(search);
  }
  async getByUuid(uuid) {
    const item = await this.repository.findByUuid(uuid);
    if (!item) throw new AppError('Brand not found', HTTP_STATUS.NOT_FOUND);
    return item;
  }
  async create(values, userId) {
    const existingBrand = await this.repository.findByName(values.name, { withDeleted: true });
    if (existingBrand && !existingBrand.deletedAt)
      throw new AppError('Brand name is already in use', HTTP_STATUS.CONFLICT);
    if (existingBrand) {
      await this.repository.restore(existingBrand);
      return this.repository.update(existingBrand, { ...values, active: true, updatedBy: userId });
    }
    return this.repository.create({ ...values, createdBy: userId, updatedBy: userId });
  }
  async update(uuid, values, userId) {
    const item = await this.getByUuid(uuid);
    await this.repository.update(item, { ...values, updatedBy: userId });
    return item;
  }
  async remove(uuid, userId) {
    const item = await this.getByUuid(uuid);
    await this.repository.delete(item);
    await this.auditService.record({
      userId,
      action: 'DELETE',
      entity: 'BRAND',
      entityUuid: item.uuid,
      oldValues: item.toJSON(),
    });
  }
}
