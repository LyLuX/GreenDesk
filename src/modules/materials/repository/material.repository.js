import { Op } from 'sequelize';

import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import Material from '../model/material.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import Category from '../../categories/model/category.model.js';
import MaintenanceTask from '../../maintenance/model/maintenance-task.model.js';

const include = [
  {
    model: PartManufacturer,
    as: 'manufacturer',
    attributes: ['uuid', 'name', 'logoFileName'],
  },
  { model: Category, as: 'category', attributes: ['uuid', 'name'] },
];

/** Sequelize persistence operations for material catalogue records. */
export default class MaterialRepository extends TransactionalRepository {
  async findOptions({ search, active, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    const where = search ? { name: { [Op.like]: `%${search}%` } } : {};
    const normalizedActive = normalizeBooleanFilter(active);
    if (normalizedActive !== undefined) where.active = normalizedActive;
    return Material.findAndCountAll({
      attributes: ['uuid', 'name', 'active'],
      where,
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }

  async findAll({
    search,
    active,
    manufacturerUuid,
    categoryUuid,
    page = 1,
    limit = 5,
    sort = 'purchaseDate',
    direction = 'DESC',
  } = {}) {
    const where = {};
    if (search)
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { serialNumber: { [Op.like]: `%${search}%` } },
      ];
    const normalizedActive = normalizeBooleanFilter(active);
    if (normalizedActive !== undefined) where.active = normalizedActive;
    const filteredInclude = [
      {
        ...include[0],
        ...(manufacturerUuid ? { where: { uuid: manufacturerUuid }, required: true } : {}),
      },
      { ...include[1], ...(categoryUuid ? { where: { uuid: categoryUuid }, required: true } : {}) },
    ];
    const pagination = normalizePagination({ page, limit });
    const sortField = ['name', 'purchasePrice', 'purchaseDate'].includes(sort)
      ? sort
      : 'purchaseDate';
    const sortDirection = direction === 'ASC' ? 'ASC' : 'DESC';
    return Material.findAndCountAll({
      where,
      include: filteredInclude,
      order: [
        [sortField, sortDirection],
        ['id', sortDirection],
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
    });
  }

  async findByUuid(uuid, options = {}) {
    return Material.findOne({
      where: { uuid },
      include: [...include, { association: 'files' }],
      transaction: options.transaction,
      lock: options.lock ? options.transaction?.LOCK.UPDATE : undefined,
    });
  }

  async findByName(name, { withDeleted = false, transaction } = {}) {
    return Material.findOne({ where: { name }, paranoid: !withDeleted, transaction });
  }

  async findBySerialNumber(serialNumber, { withDeleted = false, transaction } = {}) {
    return serialNumber
      ? Material.findOne({ where: { serialNumber }, paranoid: !withDeleted, transaction })
      : null;
  }

  async create(values, options = {}) {
    return Material.create(values, options);
  }

  async update(material, values, options = {}) {
    return material.update(values, options);
  }

  async delete(material, options = {}) {
    return material.destroy(options);
  }

  async restore(material, options = {}) {
    return material.restore(options);
  }

  async countMaintenanceTasks(materialId, options = {}) {
    return MaintenanceTask.count({
      where: { materialId },
      paranoid: false,
      transaction: options.transaction,
    });
  }

  async deactivateMaintenanceTasks(materialId, updatedAt, userId, options = {}) {
    return MaintenanceTask.update(
      { active: false, updatedBy: userId, updatedAt },
      {
        where: { materialId, active: true },
        transaction: options.transaction,
        silent: true,
      },
    );
  }

  async reactivateMaintenanceTasks(materialId, deactivatedAt, userId, options = {}) {
    const timestamps = [
      ...new Map(
        deactivatedAt
          .filter(Boolean)
          .map((value) => new Date(value))
          .filter((value) => !Number.isNaN(value.getTime()))
          .map((value) => [value.getTime(), value]),
      ).values(),
    ];
    if (!timestamps.length) return [0];
    return MaintenanceTask.update(
      { active: true, updatedBy: userId },
      {
        where: {
          materialId,
          active: false,
          updatedAt: { [Op.in]: timestamps },
        },
        transaction: options.transaction,
      },
    );
  }
}
