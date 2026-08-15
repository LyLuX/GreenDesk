import { Op } from 'sequelize';

import Role from '../model/role.model.js';
import Permission from '../../permissions/model/permission.model.js';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import { normalizePagination } from '../../../core/utils/pagination.js';

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
  async findAll({ search, permissionUuid, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    const pattern = search ? `%${search}%` : undefined;
    const pageResult = await Role.findAndCountAll({
      attributes: ['id'],
      where: pattern
        ? {
            [Op.or]: [{ name: { [Op.like]: pattern } }, { description: { [Op.like]: pattern } }],
          }
        : {},
      include: permissionUuid
        ? [
            {
              model: Permission,
              as: 'permissions',
              attributes: [],
              through: { attributes: [] },
              where: { uuid: permissionUuid },
              required: true,
            },
          ]
        : [],
      order: [['name', 'ASC']],
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset,
    });
    const ids = pageResult.rows.map((role) => role.id);
    const rows = ids.length
      ? await Role.findAll({
          where: { id: { [Op.in]: ids } },
          include: permissionInclude,
          order: [['name', 'ASC']],
        })
      : [];
    return { count: pageResult.count, rows };
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
