import CategoryRepository from '../../../core/database/repositories/category.repository.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';

/** Business lifecycle for categories. */
export default class CategoryService {
  constructor(categoryRepository = new CategoryRepository(), auditService = new AuditService()) {
    this.categoryRepository = categoryRepository;
    this.auditService = auditService;
  }
  async getAll(search) {
    return this.categoryRepository.findAll(search);
  }
  async getByUuid(uuid) {
    const item = await this.categoryRepository.findByUuid(uuid);
    if (!item) throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
    return item;
  }
  async create(values, userId) {
    await this.ensureName(values.name);
    const item = await this.categoryRepository.create({
      ...values,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditService.record({
      userId,
      action: 'CREATE',
      entity: 'CATEGORY',
      entityUuid: item.uuid,
      newValues: item.toJSON(),
    });
    return item;
  }
  async update(uuid, values, userId) {
    const item = await this.getByUuid(uuid);
    const oldValues = item.toJSON();
    if (values.name && values.name !== item.name) await this.ensureName(values.name);
    await this.categoryRepository.update(item, { ...values, updatedBy: userId });
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'CATEGORY',
      entityUuid: item.uuid,
      oldValues,
      newValues: item.toJSON(),
    });
    return item;
  }
  async changeStatus(uuid, active, userId) {
    const item = await this.getByUuid(uuid);
    const oldValues = item.toJSON();
    await this.categoryRepository.update(item, { active, updatedBy: userId });
    await this.auditService.record({
      userId,
      action: 'STATUS_CHANGE',
      entity: 'CATEGORY',
      entityUuid: item.uuid,
      oldValues,
      newValues: item.toJSON(),
    });
    return item;
  }
  async ensureName(name) {
    if (await this.categoryRepository.findByName(name))
      throw new AppError('Category name is already in use', HTTP_STATUS.CONFLICT);
  }
}
