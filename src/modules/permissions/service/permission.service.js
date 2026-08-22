import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import PermissionRepository from '../repository/permission.repository.js';
import AuditService from '../../audit/service/audit.service.js';
import { normalizePagination, paginatedResult } from '../../../core/utils/pagination.js';

/** Business operations for permissions. */
export default class PermissionService {
  constructor(
    permissionRepository = new PermissionRepository(),
    auditService = new AuditService(),
  ) {
    this.permissionRepository = permissionRepository;
    this.auditService = auditService;
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
  async create(values, actorUserId = null) {
    return this.permissionRepository.withTransaction(async (transaction) => {
      const existingPermission = await this.permissionRepository.findByName(values.name, {
        withDeleted: true,
        transaction,
      });
      if (existingPermission && !existingPermission.deletedAt)
        throw new AppError('Permission name is already in use', HTTP_STATUS.CONFLICT);
      if (existingPermission) {
        const oldValues = existingPermission.toJSON?.() ?? existingPermission;
        await this.permissionRepository.restore(existingPermission, { transaction });
        const restored = await this.permissionRepository.update(existingPermission, values, {
          transaction,
        });
        await this.auditService.record(
          {
            userId: actorUserId,
            action: 'RESTORE',
            entity: 'PERMISSION',
            entityUuid: restored.uuid,
            oldValues,
            newValues: restored.toJSON?.() ?? restored,
          },
          { transaction },
        );
        return restored;
      }
      const permission = await this.permissionRepository.create(values, { transaction });
      await this.auditService.record(
        {
          userId: actorUserId,
          action: 'CREATE',
          entity: 'PERMISSION',
          entityUuid: permission.uuid,
          newValues: permission.toJSON?.() ?? permission,
        },
        { transaction },
      );
      return permission;
    });
  }
  async update(uuid, values, actorUserId = null) {
    const permission = await this.getByUuid(uuid);
    const oldValues = permission.toJSON?.() ?? { ...permission };
    return this.permissionRepository.withTransaction(async (transaction) => {
      await this.permissionRepository.update(permission, values, { transaction });
      await this.auditService.record(
        {
          userId: actorUserId,
          action: 'UPDATE',
          entity: 'PERMISSION',
          entityUuid: permission.uuid,
          oldValues,
          newValues: permission.toJSON?.() ?? permission,
        },
        { transaction },
      );
      return permission;
    });
  }
  async remove(uuid, actorUserId = null) {
    const permission = await this.getByUuid(uuid);
    await this.permissionRepository.withTransaction(async (transaction) => {
      await this.permissionRepository.delete(permission, { transaction });
      await this.auditService.record(
        {
          userId: actorUserId,
          action: 'DELETE',
          entity: 'PERMISSION',
          entityUuid: permission.uuid,
          oldValues: permission.toJSON?.() ?? permission,
        },
        { transaction },
      );
    });
  }
}
