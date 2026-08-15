import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import PermissionRepository from '../repository/permission.repository.js';
import { normalizePagination, paginatedResult } from '../../../core/utils/pagination.js';

/** Business operations for permissions. */
export default class PermissionService {
  constructor(permissionRepository = new PermissionRepository()) {
    this.permissionRepository = permissionRepository;
  }
  async getAll(query = {}) {
    const result = await this.permissionRepository.findAll(query);
    return paginatedResult(result, normalizePagination(query));
  }
  async getByUuid(uuid) {
    const permission = await this.permissionRepository.findByUuid(uuid);
    if (!permission) throw new AppError('Permission not found', HTTP_STATUS.NOT_FOUND);
    return permission;
  }
  async create(values) {
    return this.permissionRepository.withTransaction(async (transaction) => {
      const existingPermission = await this.permissionRepository.findByName(values.name, {
        withDeleted: true,
        transaction,
      });
      if (existingPermission && !existingPermission.deletedAt)
        throw new AppError('Permission name is already in use', HTTP_STATUS.CONFLICT);
      if (existingPermission) {
        await this.permissionRepository.restore(existingPermission, { transaction });
        return this.permissionRepository.update(existingPermission, values, { transaction });
      }
      return this.permissionRepository.create(values, { transaction });
    });
  }
  async update(uuid, values) {
    const permission = await this.getByUuid(uuid);
    return this.permissionRepository.withTransaction(async (transaction) => {
      await this.permissionRepository.update(permission, values, { transaction });
      return permission;
    });
  }
  async remove(uuid) {
    const permission = await this.getByUuid(uuid);
    await this.permissionRepository.withTransaction((transaction) =>
      this.permissionRepository.delete(permission, { transaction }),
    );
  }
}
