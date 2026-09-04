import HTTP_STATUS from '../../../core/constants/http-status.js';
import { isRoleUserReadPermission } from '../../../core/constants/user-visibility-permissions.js';
import AppError from '../../../core/errors/app-error.js';
import PermissionRepository from '../repository/permission.repository.js';
import AuditService from '../../audit/service/audit.service.js';
import UserRepository from '../../users/repository/user.repository.js';
import { normalizePagination, paginatedResult } from '../../../core/utils/pagination.js';

/** Business operations for permissions. */
export default class PermissionService {
  constructor(
    permissionRepository = new PermissionRepository(),
    auditService = new AuditService(),
    userRepository = new UserRepository(),
  ) {
    this.permissionRepository = permissionRepository;
    this.auditService = auditService;
    this.userRepository = userRepository;
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
    if (isRoleUserReadPermission(values.name)) {
      throw new AppError(
        'Cette famille de permissions est réservée à la gestion automatique des rôles.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }
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
        await this.userRepository.incrementAuthorizationVersionsForPermission(
          existingPermission.id,
          { transaction },
        );
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
    if (
      isRoleUserReadPermission(permission.name) ||
      (values.name && isRoleUserReadPermission(values.name))
    ) {
      throw new AppError(
        'Cette permission est gérée automatiquement par son rôle.',
        HTTP_STATUS.CONFLICT,
      );
    }
    const oldValues = permission.toJSON?.() ?? { ...permission };
    const nameChanged = Object.hasOwn(values, 'name') && values.name !== oldValues.name;
    return this.permissionRepository.withTransaction(async (transaction) => {
      await this.permissionRepository.update(permission, values, { transaction });
      if (nameChanged) {
        await this.userRepository.incrementAuthorizationVersionsForPermission(permission.id, {
          transaction,
        });
      }
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
    if (isRoleUserReadPermission(permission.name)) {
      throw new AppError(
        'Cette permission sera supprimée automatiquement avec son rôle.',
        HTTP_STATUS.CONFLICT,
      );
    }
    await this.permissionRepository.withTransaction(async (transaction) => {
      await this.userRepository.incrementAuthorizationVersionsForPermission(permission.id, {
        transaction,
      });
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
