import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import PermissionRepository from '../../permissions/repository/permission.repository.js';
import RoleRepository from '../repository/role.repository.js';
import { normalizePagination, paginatedResult } from '../../../core/utils/pagination.js';

/** Business operations for roles. */
export default class RoleService {
  constructor(
    roleRepository = new RoleRepository(),
    permissionRepository = new PermissionRepository(),
  ) {
    this.roleRepository = roleRepository;
    this.permissionRepository = permissionRepository;
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
  async create(values) {
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
        return this.roleRepository.findByUuid(existingRole.uuid, { transaction });
      }
      const role = await this.roleRepository.create(roleValues, { transaction });
      if (permissions) await this.roleRepository.setPermissions(role, permissions, { transaction });
      return this.roleRepository.findByUuid(role.uuid, { transaction });
    });
  }
  async update(uuid, values) {
    const role = await this.getByUuid(uuid);
    const { permissionUuids, ...roleValues } = values;
    const permissions =
      permissionUuids !== undefined ? await this.findPermissions(permissionUuids) : null;
    return this.roleRepository.withTransaction(async (transaction) => {
      await this.roleRepository.update(role, roleValues, { transaction });
      if (permissions) await this.roleRepository.setPermissions(role, permissions, { transaction });
      return this.roleRepository.findByUuid(uuid, { transaction });
    });
  }
  async remove(uuid) {
    const role = await this.getByUuid(uuid);
    await this.roleRepository.withTransaction((transaction) =>
      this.roleRepository.delete(role, { transaction }),
    );
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
