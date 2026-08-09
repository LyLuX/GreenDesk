import { Op } from 'sequelize';

import { withTransaction } from '../../../core/database/transaction-context.js';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
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
export default class MaterialRepository {
  async findAll({
    search,
    active,
    manufacturerUuid,
    categoryUuid,
    page = 1,
    limit = 5,
    sort = 'name',
    direction = 'ASC',
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
    const normalizedLimit = limit === 'all' ? null : Math.min(Number(limit) || 5, 100);
    return Material.findAndCountAll({
      where,
      include: filteredInclude,
      order: [
        [
          ['name', 'purchasePrice', 'purchaseDate'].includes(sort) ? sort : 'name',
          direction === 'DESC' ? 'DESC' : 'ASC',
        ],
      ],
      ...(normalizedLimit
        ? {
            limit: normalizedLimit,
            offset: (Math.max(Number(page), 1) - 1) * normalizedLimit,
          }
        : {}),
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

  async findByName(name, { withDeleted = false } = {}) {
    return Material.findOne({ where: { name }, paranoid: !withDeleted });
  }

  async findBySerialNumber(serialNumber, { withDeleted = false } = {}) {
    return serialNumber
      ? Material.findOne({ where: { serialNumber }, paranoid: !withDeleted })
      : null;
  }

  async create(values) {
    return Material.create(values);
  }

  async update(material, values, options = {}) {
    return material.update(values, options);
  }

  async delete(material, options = {}) {
    return material.destroy(options);
  }

  async restore(material) {
    return material.restore();
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

  async withTransaction(callback) {
    return withTransaction(callback);
  }
}
