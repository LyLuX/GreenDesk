import Permission from '../model/permission.model.js';

/** Database access for permissions. */
export default class PermissionRepository {
  async findAll() {
    return Permission.findAll({ order: [['name', 'ASC']] });
  }
  async findByUuid(uuid) {
    return Permission.findOne({ where: { uuid } });
  }
  async findByName(name) {
    return Permission.findOne({ where: { name } });
  }
  async create(values) {
    return Permission.create(values);
  }
  async update(permission, values) {
    return permission.update(values);
  }
  async delete(permission) {
    return permission.destroy();
  }
}
