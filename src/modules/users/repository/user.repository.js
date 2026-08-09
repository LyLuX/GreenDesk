import User from '../model/user.model.js';
import Role from '../../roles/model/role.model.js';
import Permission from '../../permissions/model/permission.model.js';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';

const roleInclude = [
  {
    model: Role,
    as: 'roles',
    attributes: ['uuid', 'name', 'description'],
    include: [
      { model: Permission, as: 'permissions', attributes: ['name'], through: { attributes: [] } },
    ],
    through: { attributes: [] },
  },
];

/** Database access for users. */
export default class UserRepository extends TransactionalRepository {
  async findAll() {
    return User.findAll({
      include: roleInclude,
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    });
  }
  async findByUuid(uuid, { transaction } = {}) {
    return User.findOne({ where: { uuid }, include: roleInclude, transaction });
  }
  async findByEmail(email, { withDeleted = false, transaction } = {}) {
    return User.findOne({
      where: { email },
      include: roleInclude,
      paranoid: !withDeleted,
      transaction,
    });
  }
  async findByEmailWithPassword(email) {
    return User.scope('withPassword').findOne({ where: { email }, include: roleInclude });
  }
  async isActiveByClaims(id, uuid) {
    if (!id || !uuid) return false;
    return Boolean(
      await User.findOne({
        where: { id, uuid, isActive: true },
        attributes: ['id'],
      }),
    );
  }
  async create(values, { transaction } = {}) {
    return User.create(values, { transaction });
  }
  async update(user, values, { transaction } = {}) {
    return user.update(values, { transaction });
  }
  async delete(user, { transaction } = {}) {
    return user.destroy({ transaction });
  }
  async restore(user, { transaction } = {}) {
    return user.restore({ transaction });
  }
  async setRoles(user, roles, { transaction } = {}) {
    return user.setRoles(roles, { transaction });
  }
}
