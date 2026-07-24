import Permission from '../model/permission.model.js';

/** Database access for permissions. */
export default class PermissionRepository {
  async findAll() {
    return Permission.findAll({ order: [['name', 'ASC']] });
  }
  async findByUuid(uuid) {
    return Permission.findOne({ where: { uuid } });
  }
  async findByName(name, { withDeleted = false } = {}) {
    return Permission.findOne({ where: { name }, paranoid: !withDeleted });
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
  async restore(permission) {
    return permission.restore();
  }
}
