import User from '../model/user.model.js';
import Role from '../../roles/model/role.model.js';
import Permission from '../../permissions/model/permission.model.js';

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
export default class UserRepository {
  async findAll() {
    return User.findAll({
      include: roleInclude,
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    });
  }
  async findByUuid(uuid) {
    return User.findOne({ where: { uuid }, include: roleInclude });
  }
  async findByEmail(email, { withDeleted = false } = {}) {
    return User.findOne({ where: { email }, include: roleInclude, paranoid: !withDeleted });
  }
  async findByEmailWithPassword(email) {
    return User.scope('withPassword').findOne({ where: { email }, include: roleInclude });
  }
  async create(values) {
    return User.create(values);
  }
  async update(user, values) {
    return user.update(values);
  }
  async delete(user) {
    return user.destroy();
  }
  async restore(user) {
    return user.restore();
  }
  async setRoles(user, roles) {
    return user.setRoles(roles);
  }
}
