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
    const existingCategory = await this.categoryRepository.findByName(values.name, {
      withDeleted: true,
    });
    if (existingCategory && !existingCategory.deletedAt) await this.ensureName(values.name);
    const oldValues = existingCategory?.toJSON();
    if (existingCategory) {
      await this.categoryRepository.restore(existingCategory);
      await this.categoryRepository.update(existingCategory, {
        ...values,
        active: true,
        updatedBy: userId,
      });
    }
    const item =
      existingCategory ??
      (await this.categoryRepository.create({
        ...values,
        createdBy: userId,
        updatedBy: userId,
      }));
    await this.auditService.record({
      userId,
      action: existingCategory ? 'RESTORE' : 'CREATE',
      entity: 'CATEGORY',
      entityUuid: item.uuid,
      ...(oldValues ? { oldValues } : {}),
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
  async remove(uuid, userId) {
    const item = await this.getByUuid(uuid);
    const oldValues = item.toJSON();
    await this.categoryRepository.delete(item);
    await this.auditService.record({
      userId,
      action: 'DELETE',
      entity: 'CATEGORY',
      entityUuid: item.uuid,
      oldValues,
    });
  }
  async ensureName(name) {
    if (await this.categoryRepository.findByName(name))
      throw new AppError('Category name is already in use', HTTP_STATUS.CONFLICT);
  }
}
