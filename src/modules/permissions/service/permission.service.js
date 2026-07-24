import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import PermissionRepository from '../repository/permission.repository.js';

/** Business operations for permissions. */
export default class PermissionService {
  constructor(permissionRepository = new PermissionRepository()) {
    this.permissionRepository = permissionRepository;
  }
  async getAll() {
    return this.permissionRepository.findAll();
  }
  async getByUuid(uuid) {
    const permission = await this.permissionRepository.findByUuid(uuid);
    if (!permission) throw new AppError('Permission not found', HTTP_STATUS.NOT_FOUND);
    return permission;
  }
  async create(values) {
    const existingPermission = await this.permissionRepository.findByName(values.name, {
      withDeleted: true,
    });
    if (existingPermission && !existingPermission.deletedAt)
      throw new AppError('Permission name is already in use', HTTP_STATUS.CONFLICT);
    if (existingPermission) {
      await this.permissionRepository.restore(existingPermission);
      return this.permissionRepository.update(existingPermission, values);
    }
    return this.permissionRepository.create(values);
  }
  async update(uuid, values) {
    const permission = await this.getByUuid(uuid);
    await this.permissionRepository.update(permission, values);
    return permission;
  }
  async remove(uuid) {
    const permission = await this.getByUuid(uuid);
    await this.permissionRepository.delete(permission);
  }
}
