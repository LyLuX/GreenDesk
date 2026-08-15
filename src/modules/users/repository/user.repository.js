import { Op } from 'sequelize';

import User from '../model/user.model.js';
import Role from '../../roles/model/role.model.js';
import Permission from '../../permissions/model/permission.model.js';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
import { normalizePagination } from '../../../core/utils/pagination.js';

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
  async findAll({ search, active, roleUuid, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    const where = {};
    if (search) {
      const pattern = `%${search}%`;
      where[Op.or] = [
        { firstName: { [Op.like]: pattern } },
        { lastName: { [Op.like]: pattern } },
        { email: { [Op.like]: pattern } },
      ];
    }
    const normalizedActive = normalizeBooleanFilter(active);
    if (normalizedActive !== undefined) where.isActive = normalizedActive;
    const pageResult = await User.findAndCountAll({
      attributes: ['id'],
      where,
      include: roleUuid
        ? [
            {
              model: Role,
              as: 'roles',
              attributes: [],
              where: { uuid: roleUuid },
              through: { attributes: [] },
              required: true,
            },
          ]
        : [],
      distinct: true,
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
      limit: pagination.limit,
      offset: pagination.offset,
    });
    const ids = pageResult.rows.map((user) => user.id);
    const rows = ids.length
      ? await User.findAll({
          where: { id: { [Op.in]: ids } },
          include: roleInclude,
          order: [
            ['lastName', 'ASC'],
            ['firstName', 'ASC'],
          ],
        })
      : [];
    return { count: pageResult.count, rows };
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
