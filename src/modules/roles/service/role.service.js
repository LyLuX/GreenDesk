import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import PermissionRepository from '../../permissions/repository/permission.repository.js';
import UserRepository from '../../users/repository/user.repository.js';
import RoleRepository from '../repository/role.repository.js';
import { normalizePagination, paginatedResult } from '../../../core/utils/pagination.js';

const sameUuids = (left = [], right = []) => {
  const leftUuids = left.map(({ uuid }) => uuid).sort();
  const rightUuids = right.map(({ uuid }) => uuid).sort();
  return (
    leftUuids.length === rightUuids.length &&
    leftUuids.every((uuid, index) => uuid === rightUuids[index])
  );
};

/** Business operations for roles. */
export default class RoleService {
  constructor(
    roleRepository = new RoleRepository(),
    permissionRepository = new PermissionRepository(),
    userRepository = new UserRepository(),
  ) {
    this.roleRepository = roleRepository;
    this.permissionRepository = permissionRepository;
    this.userRepository = userRepository;
  }
  async getAll(query = {}) {
    const result = await this.roleRepository.findAll(query);
    return paginatedResult(result, normalizePagination(query));
  }
  async getByUuid(uuid) {
    const role = await this.roleRepository.findByUuid(uuid);
    if (!role) throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND);
    return role;
  }
  async create(values, actorUserId = null) {
    const { permissionUuids, ...roleValues } = values;
    const permissions = permissionUuids?.length
      ? await this.findPermissions(permissionUuids)
      : null;
    return this.roleRepository.withTransaction(async (transaction) => {
      const existingRole = await this.roleRepository.findByName(values.name, {
        withDeleted: true,
        transaction,
      });
      if (existingRole && !existingRole.deletedAt)
        throw new AppError('Role name is already in use', HTTP_STATUS.CONFLICT);
      if (existingRole) {
        await this.roleRepository.restore(existingRole, { transaction });
        await this.roleRepository.update(existingRole, roleValues, { transaction });
        if (permissions)
          await this.roleRepository.setPermissions(existingRole, permissions, { transaction });
        await this.userRepository.incrementAuthorizationVersionsForRole(existingRole.id, {
          excludeUserId: actorUserId,
          transaction,
        });
        return this.roleRepository.findByUuid(existingRole.uuid, { transaction });
      }
      const role = await this.roleRepository.create(roleValues, { transaction });
      if (permissions) await this.roleRepository.setPermissions(role, permissions, { transaction });
      return this.roleRepository.findByUuid(role.uuid, { transaction });
    });
  }
  async update(uuid, values, actorUserId = null) {
    const role = await this.getByUuid(uuid);
    const { permissionUuids, ...roleValues } = values;
    const permissions =
      permissionUuids !== undefined ? await this.findPermissions(permissionUuids) : null;
    const permissionsChanged = permissions !== null && !sameUuids(role.permissions, permissions);
    return this.roleRepository.withTransaction(async (transaction) => {
      await this.roleRepository.update(role, roleValues, { transaction });
      if (permissions) await this.roleRepository.setPermissions(role, permissions, { transaction });
      if (permissionsChanged) {
        await this.userRepository.incrementAuthorizationVersionsForRole(role.id, {
          excludeUserId: actorUserId,
          transaction,
        });
      }
      return this.roleRepository.findByUuid(uuid, { transaction });
    });
  }
  async remove(uuid, actorUserId = null) {
    const role = await this.getByUuid(uuid);
    await this.roleRepository.withTransaction(async (transaction) => {
      await this.userRepository.incrementAuthorizationVersionsForRole(role.id, {
        excludeUserId: actorUserId,
        transaction,
      });
      await this.roleRepository.delete(role, { transaction });
    });
  }

  /** Resolves permission UUIDs before a role write is performed. */
  async findPermissions(permissionUuids) {
    const permissions = await Promise.all(
      permissionUuids.map((permissionUuid) => this.permissionRepository.findByUuid(permissionUuid)),
    );
    if (permissions.some((permission) => !permission))
      throw new AppError('One or more permissions were not found', HTTP_STATUS.BAD_REQUEST);
    return permissions;
  }
}
