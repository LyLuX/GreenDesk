import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import RoleRepository from '../repository/role.repository.js';

/** Business operations for roles. */
export default class RoleService {
  constructor(roleRepository = new RoleRepository()) {
    this.roleRepository = roleRepository;
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
    if (await this.roleRepository.findByName(values.name))
      throw new AppError('Role name is already in use', HTTP_STATUS.CONFLICT);
    return this.roleRepository.create(values);
  }
  async update(uuid, values) {
    const role = await this.getByUuid(uuid);
    await this.roleRepository.update(role, values);
    return role;
  }
  async remove(uuid) {
    const role = await this.getByUuid(uuid);
    await this.roleRepository.delete(role);
  }
}
