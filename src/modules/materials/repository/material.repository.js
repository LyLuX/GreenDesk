import { Op } from 'sequelize';

import Material from '../model/material.model.js';
import Brand from '../../brands/model/brand.model.js';
import Category from '../../categories/model/category.model.js';
import Property from '../../properties/model/property.model.js';

const include = [
  { model: Brand, as: 'brand', attributes: ['uuid', 'name'] },
  { model: Category, as: 'category', attributes: ['uuid', 'name'] },
  { model: Property, as: 'property', attributes: ['uuid', 'name'] },
];

/** Sequelize persistence operations for material catalogue records. */
export default class MaterialRepository {
  async findAll({
    search,
    active,
    brandUuid,
    categoryUuid,
    propertyUuid,
    page = 1,
    limit = 25,
    sort = 'name',
    direction = 'ASC',
  } = {}) {
    const where = {};
    if (search)
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } },
        { serialNumber: { [Op.like]: `%${search}%` } },
      ];
    if (active !== undefined) where.active = active;
    const filteredInclude = [
      { ...include[0], ...(brandUuid ? { where: { uuid: brandUuid }, required: true } : {}) },
      { ...include[1], ...(categoryUuid ? { where: { uuid: categoryUuid }, required: true } : {}) },
      { ...include[2], ...(propertyUuid ? { where: { uuid: propertyUuid }, required: true } : {}) },
    ];
    const normalizedLimit = Math.min(Number(limit) || 25, 100);
    return Material.findAndCountAll({
      where,
      include: filteredInclude,
      order: [
        [
          ['name', 'reference', 'purchasePrice', 'purchaseDate', 'engineHours'].includes(sort)
            ? sort
            : 'name',
          direction === 'DESC' ? 'DESC' : 'ASC',
        ],
      ],
      limit: normalizedLimit,
      offset: (Math.max(Number(page), 1) - 1) * normalizedLimit,
      distinct: true,
    });
  }

  async findByUuid(uuid) {
    return Material.findOne({ where: { uuid }, include: [...include, { association: 'files' }] });
  }

  async findByName(name, { withDeleted = false } = {}) {
    return Material.findOne({ where: { name }, paranoid: !withDeleted });
  }

  async findByReference(reference, { withDeleted = false } = {}) {
    return reference ? Material.findOne({ where: { reference }, paranoid: !withDeleted }) : null;
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
