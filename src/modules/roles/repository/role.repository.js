import Role from '../model/role.model.js';
import Permission from '../../permissions/model/permission.model.js';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';

const permissionInclude = [
  {
    model: Permission,
    as: 'permissions',
    attributes: ['uuid', 'name', 'description'],
    through: { attributes: [] },
  },
];

/** Database access for roles. */
export default class RoleRepository extends TransactionalRepository {
  async findAll() {
    return Role.findAll({ include: permissionInclude, order: [['name', 'ASC']] });
  }
  async findByUuid(uuid, { transaction } = {}) {
    return Role.findOne({ where: { uuid }, include: permissionInclude, transaction });
  }
  async findByName(name, { withDeleted = false, transaction } = {}) {
    return Role.findOne({ where: { name }, paranoid: !withDeleted, transaction });
  }
  async create(values, { transaction } = {}) {
    return Role.create(values, { transaction });
  }
  async update(role, values, { transaction } = {}) {
    return role.update(values, { transaction });
  }
  async delete(role, { transaction } = {}) {
    return role.destroy({ transaction });
  }
  async restore(role, { transaction } = {}) {
    return role.restore({ transaction });
  }
  async setPermissions(role, permissions, { transaction } = {}) {
    return role.setPermissions(permissions, { transaction });
  }
}
