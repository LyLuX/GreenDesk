import { Op } from 'sequelize';

import User from '../model/user.model.js';
import Role from '../../roles/model/role.model.js';
import Permission from '../../permissions/model/permission.model.js';
import Company from '../../companies/model/company.model.js';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
import { normalizePagination } from '../../../core/utils/pagination.js';

const userIncludes = [
  {
    model: Role,
    as: 'roles',
    attributes: ['uuid', 'name', 'description'],
    include: [
      { model: Permission, as: 'permissions', attributes: ['name'], through: { attributes: [] } },
    ],
    through: { attributes: [] },
  },
  {
    model: Company,
    as: 'companies',
    attributes: ['id', 'uuid', 'name', 'active', 'logoFileName', 'updatedAt'],
    through: { attributes: [] },
  },
];
const userListOrder = [
  ['lastLoginAt', 'DESC'],
  ['id', 'DESC'],
];

/** Database access for users. */
export default class UserRepository extends TransactionalRepository {
  async findAll({
    search,
    active,
    deleted = false,
    includeDeleted = false,
    roleUuid,
    visibleRoleNames,
    companyId,
    page,
    limit,
  } = {}) {
    const pagination = normalizePagination({ page, limit });
    if (Array.isArray(visibleRoleNames) && !visibleRoleNames.length) {
      return { count: 0, rows: [] };
    }
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
    if (deleted) where.deletedAt = { [Op.ne]: null };
    const pageResult = await User.findAndCountAll({
      attributes: ['id', 'lastLoginAt'],
      where,
      include: [
        ...(roleUuid || Array.isArray(visibleRoleNames)
          ? [
              {
                model: Role,
                as: 'roles',
                attributes: [],
                where: {
                  ...(roleUuid ? { uuid: roleUuid } : {}),
                  ...(Array.isArray(visibleRoleNames)
                    ? { name: { [Op.in]: visibleRoleNames } }
                    : {}),
                },
                through: { attributes: [] },
                required: true,
              },
            ]
          : []),
        ...(companyId
          ? [
              {
                model: Company,
                as: 'companies',
                attributes: [],
                where: { id: companyId },
                through: { attributes: [] },
                required: true,
              },
            ]
          : []),
      ],
      distinct: true,
      order: userListOrder,
      limit: pagination.limit,
      offset: pagination.offset,
      paranoid: !(deleted || includeDeleted),
    });
    const ids = pageResult.rows.map((user) => user.id);
    const rows = ids.length
      ? await User.findAll({
          where: {
            id: { [Op.in]: ids },
            ...(deleted ? { deletedAt: { [Op.ne]: null } } : {}),
          },
          include: userIncludes,
          order: userListOrder,
          paranoid: !(deleted || includeDeleted),
        })
      : [];
    return { count: pageResult.count, rows };
  }
  async findByUuid(uuid, { withDeleted = false, visibleRoleNames, companyId, transaction } = {}) {
    if (Array.isArray(visibleRoleNames) && !visibleRoleNames.length) return null;
    if (Array.isArray(visibleRoleNames) || companyId) {
      const visibleUser = await User.findOne({
        attributes: ['id'],
        where: { uuid },
        include: [
          ...(Array.isArray(visibleRoleNames)
            ? [
                {
                  model: Role,
                  as: 'roles',
                  attributes: [],
                  where: { name: { [Op.in]: visibleRoleNames } },
                  through: { attributes: [] },
                  required: true,
                },
              ]
            : []),
          ...(companyId
            ? [
                {
                  model: Company,
                  as: 'companies',
                  attributes: [],
                  where: { id: companyId },
                  through: { attributes: [] },
                  required: true,
                },
              ]
            : []),
        ],
        paranoid: !withDeleted,
        transaction,
      });
      if (!visibleUser) return null;
      return User.findByPk(visibleUser.id, {
        include: userIncludes,
        paranoid: !withDeleted,
        transaction,
      });
    }
    return User.findOne({
      where: { uuid },
      include: userIncludes,
      paranoid: !withDeleted,
      transaction,
    });
  }
  async findById(id, { transaction } = {}) {
    return User.findByPk(id, { include: userIncludes, transaction });
  }
  async findByEmail(email, { withDeleted = false, transaction } = {}) {
    return User.findOne({
      where: { email },
      include: userIncludes,
      paranoid: !withDeleted,
      transaction,
    });
  }
  async findByEmailWithPassword(email) {
    return User.scope('withPassword').findOne({ where: { email }, include: userIncludes });
  }
  async isActiveByClaims(id, uuid, authorizationVersion) {
    if (!id || !uuid) return false;
    return Boolean(
      await User.findOne({
        where: { id, uuid, isActive: true, authorizationVersion },
        attributes: ['id'],
      }),
    );
  }
  async incrementAuthorizationVersion(id, { transaction } = {}) {
    return User.increment('authorizationVersion', { where: { id }, transaction });
  }
  async incrementAuthorizationVersionsForRole(roleId, { excludeUserId = null, transaction } = {}) {
    const where = excludeUserId === null ? {} : { id: { [Op.ne]: excludeUserId } };
    const users = await User.findAll({
      attributes: ['id'],
      where,
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: [],
          where: { id: roleId },
          through: { attributes: [] },
          required: true,
        },
      ],
      transaction,
    });
    const userIds = users.map(({ id }) => id);
    if (!userIds.length) return 0;
    await User.increment('authorizationVersion', {
      where: { id: { [Op.in]: userIds } },
      transaction,
    });
    return userIds.length;
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
  async setCompanies(user, companies, { transaction } = {}) {
    return user.setCompanies(companies, { transaction });
  }
}
