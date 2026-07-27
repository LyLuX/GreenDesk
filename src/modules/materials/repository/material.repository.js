import { Op } from 'sequelize';

import Material from '../model/material.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import Category from '../../categories/model/category.model.js';

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
    if (active !== undefined && active !== '') where.active = active;
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

  async findByUuid(uuid) {
    return Material.findOne({ where: { uuid }, include: [...include, { association: 'files' }] });
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

  async update(material, values) {
    return material.update(values);
  }

  async delete(material) {
    return material.destroy();
  }

  async restore(material) {
    return material.restore();
  }
}
