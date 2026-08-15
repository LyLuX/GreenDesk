import CategoryRepository from '../../../core/database/repositories/category.repository.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import { normalizePagination, paginatedResult } from '../../../core/utils/pagination.js';

/** Business lifecycle for categories. */
export default class CategoryService {
  constructor(categoryRepository = new CategoryRepository(), auditService = new AuditService()) {
    this.categoryRepository = categoryRepository;
    this.auditService = auditService;
  }
  async getAll(query = {}) {
    const result = await this.categoryRepository.findAll(query);
    return paginatedResult(result, normalizePagination(query));
  }
  async getByUuid(uuid, options) {
    const item = await this.categoryRepository.findByUuid(uuid, options);
    if (!item) throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
    return item;
  }
  async create(values, userId) {
    return this.categoryRepository.withTransaction(async (transaction) => {
      const existingCategory = await this.categoryRepository.findByName(values.name, {
        withDeleted: true,
        transaction,
      });
      if (existingCategory && !existingCategory.deletedAt)
        await this.ensureName(values.name, undefined, { transaction });
      const oldValues = existingCategory?.toJSON();
      if (existingCategory) {
        await this.categoryRepository.restore(existingCategory, { transaction });
        await this.categoryRepository.update(
          existingCategory,
          { ...values, active: true, updatedBy: userId },
          { transaction },
        );
      }
      const item =
        existingCategory ??
        (await this.categoryRepository.create(
          { ...values, createdBy: userId, updatedBy: userId },
          { transaction },
        ));
      await this.auditService.record(
        {
          userId,
          action: existingCategory ? 'RESTORE' : 'CREATE',
          entity: 'CATEGORY',
          entityUuid: item.uuid,
          ...(oldValues ? { oldValues } : {}),
          newValues: item.toJSON(),
        },
        { transaction },
      );
      return item;
    });
  }
  async update(uuid, values, userId) {
    return this.categoryRepository.withTransaction(async (transaction) => {
      const item = await this.getByUuid(uuid, { transaction });
      const oldValues = item.toJSON();
      if (values.name) await this.ensureName(values.name, item.uuid, { transaction });
      await this.categoryRepository.update(item, { ...values, updatedBy: userId }, { transaction });
      await this.auditService.record(
        {
          userId,
          action: 'UPDATE',
          entity: 'CATEGORY',
          entityUuid: item.uuid,
          oldValues,
          newValues: item.toJSON(),
        },
        { transaction },
      );
      return item;
    });
  }
  async remove(uuid, userId) {
    return this.categoryRepository.withTransaction(async (transaction) => {
      const item = await this.getByUuid(uuid, { transaction });
      const oldValues = item.toJSON();
      await this.categoryRepository.delete(item, { transaction });
      await this.auditService.record(
        { userId, action: 'DELETE', entity: 'CATEGORY', entityUuid: item.uuid, oldValues },
        { transaction },
      );
    });
  }
  async ensureName(name, currentUuid, options) {
    const duplicate = await this.categoryRepository.findByName(name, options);
    if (duplicate && duplicate.uuid !== currentUuid)
      throw new AppError('Category name is already in use', HTTP_STATUS.CONFLICT);
  }
}
