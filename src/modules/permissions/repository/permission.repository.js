import Permission from '../model/permission.model.js';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';

/** Database access for permissions. */
export default class PermissionRepository extends TransactionalRepository {
  async findAll() {
    return Permission.findAll({ order: [['name', 'ASC']] });
  }
  async findByUuid(uuid, { transaction } = {}) {
    return Permission.findOne({ where: { uuid }, transaction });
  }
  async findByName(name, { withDeleted = false, transaction } = {}) {
    return Permission.findOne({ where: { name }, paranoid: !withDeleted, transaction });
  }
  async create(values, { transaction } = {}) {
    return Permission.create(values, { transaction });
  }
  async update(permission, values, { transaction } = {}) {
    return permission.update(values, { transaction });
  }
  async delete(permission, { transaction } = {}) {
    return permission.destroy({ transaction });
  }
  async restore(permission, { transaction } = {}) {
    return permission.restore({ transaction });
  }
}
