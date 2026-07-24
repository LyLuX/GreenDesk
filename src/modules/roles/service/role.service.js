import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import PermissionRepository from '../../permissions/repository/permission.repository.js';
import RoleRepository from '../repository/role.repository.js';

/** Business operations for roles. */
export default class RoleService {
  constructor(
    roleRepository = new RoleRepository(),
    permissionRepository = new PermissionRepository(),
  ) {
    this.roleRepository = roleRepository;
    this.permissionRepository = permissionRepository;
  }
  async getAll() {
    return this.roleRepository.findAll();
  }
  async getByUuid(uuid) {
    const role = await this.roleRepository.findByUuid(uuid);
    if (!role) throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND);
    return role;
  }
  async create(values) {
    const existingRole = await this.roleRepository.findByName(values.name, { withDeleted: true });
    if (existingRole && !existingRole.deletedAt)
      throw new AppError('Role name is already in use', HTTP_STATUS.CONFLICT);
    const { permissionUuids, ...roleValues } = values;
    const permissions = permissionUuids?.length
      ? await this.findPermissions(permissionUuids)
      : null;
    if (existingRole) {
      await this.roleRepository.restore(existingRole);
      await this.roleRepository.update(existingRole, roleValues);
      if (permissions) await this.roleRepository.setPermissions(existingRole, permissions);
      return this.getByUuid(existingRole.uuid);
    }
    const role = await this.roleRepository.create(roleValues);
    if (permissions) await this.roleRepository.setPermissions(role, permissions);
    return this.getByUuid(role.uuid);
  }
  async update(uuid, values) {
    const role = await this.getByUuid(uuid);
    const { permissionUuids, ...roleValues } = values;
    const permissions =
      permissionUuids !== undefined ? await this.findPermissions(permissionUuids) : null;
    await this.roleRepository.update(role, roleValues);
    if (permissions) await this.roleRepository.setPermissions(role, permissions);
    return this.getByUuid(uuid);
  }
  async remove(uuid) {
    const role = await this.getByUuid(uuid);
    await this.roleRepository.delete(role);
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
