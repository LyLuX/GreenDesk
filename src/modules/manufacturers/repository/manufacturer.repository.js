import { Op } from 'sequelize';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
import CompanyScopedRepository from '../../../core/database/repositories/company-scoped.repository.js';
import Material from '../../materials/model/material.model.js';
import MaintenancePart from '../../maintenance/model/maintenance-part.model.js';
import PartManufacturer from '../model/part-manufacturer.model.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import {
  requireCompanyInstance,
  companyValues,
  companyWhere,
} from '../../../core/company/company-context.js';

export default class ManufacturerRepository extends CompanyScopedRepository {
  async findAll({ search, active, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    const where = search ? { name: { [Op.like]: `%${search}%` } } : {};
    const normalizedActive = normalizeBooleanFilter(active, true);
    if (normalizedActive !== undefined) where.active = normalizedActive;
    return PartManufacturer.findAndCountAll({
      where: companyWhere(where),
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }
  async findByUuid(uuid, { transaction, withDeleted = false } = {}) {
    return PartManufacturer.findOne({
      where: companyWhere({ uuid }),
      paranoid: !withDeleted,
      transaction,
    });
  }
  async findByIds(ids) {
    if (!ids.length) return [];
    return PartManufacturer.findAll({
      attributes: ['id', 'name'],
      where: companyWhere({ id: { [Op.in]: ids } }),
      paranoid: false,
    });
  }
  async findByName(name, { transaction, withDeleted = false } = {}) {
    return PartManufacturer.findOne({
      where: companyWhere({ name }),
      paranoid: !withDeleted,
      transaction,
    });
  }
  async create(values, { transaction } = {}) {
    return PartManufacturer.create(companyValues(values), { transaction });
  }
  async update(item, values, { transaction } = {}) {
    requireCompanyInstance(item);
    return item.update(companyValues(values), { transaction });
  }
  async delete(item, { transaction } = {}) {
    requireCompanyInstance(item);
    return item.destroy({ transaction });
  }
  async restore(item, { transaction } = {}) {
    requireCompanyInstance(item);
    return item.restore({ transaction });
  }
  async countMaterials(manufacturerId, { transaction } = {}) {
    return Material.count({ where: companyWhere({ manufacturerId }), transaction });
  }
  async countParts(manufacturerId, { transaction } = {}) {
    return MaintenancePart.count({ where: companyWhere({ manufacturerId }), transaction });
  }
  async updatePartNames(manufacturerId, name, { transaction } = {}) {
    return MaintenancePart.update(
      { manufacturer: name },
      { where: companyWhere({ manufacturerId }), transaction },
    );
  }
}
