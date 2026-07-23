import Role from '../model/role.model.js';
import Permission from '../../permissions/model/permission.model.js';

const permissionInclude = [
  {
    model: Permission,
    as: 'permissions',
    attributes: ['uuid', 'name', 'description'],
    through: { attributes: [] },
  },
];

/** Database access for roles. */
export default class RoleRepository {
  async findAll() {
    return Role.findAll({ include: permissionInclude, order: [['name', 'ASC']] });
  }
  async findByUuid(uuid) {
    return Role.findOne({ where: { uuid }, include: permissionInclude });
  }
  async findByName(name) {
    return Role.findOne({ where: { name } });
  }
  async create(values) {
    return Role.create(values);
  }
  async update(role, values) {
    return role.update(values);
  }
  async delete(role) {
    return role.destroy();
  }
  async setPermissions(role, permissions) {
    return role.setPermissions(permissions);
  }
}
