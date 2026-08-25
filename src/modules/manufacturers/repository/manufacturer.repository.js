import { Op } from 'sequelize';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import Material from '../../materials/model/material.model.js';
import MaintenancePart from '../../maintenance/model/maintenance-part.model.js';
import PartManufacturer from '../model/part-manufacturer.model.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import { companyValues, companyWhere } from '../../../core/company/company-context.js';

export default class ManufacturerRepository extends TransactionalRepository {
  async findAll({ search, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    return PartManufacturer.findAndCountAll({
      where: companyWhere(search ? { name: { [Op.like]: `%${search}%` } } : {}),
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
    return item.update(values, { transaction });
  }
  async delete(item, { transaction } = {}) {
    return item.destroy({ transaction });
  }
  async restore(item, { transaction } = {}) {
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
