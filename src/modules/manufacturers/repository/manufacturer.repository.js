import { Op } from 'sequelize';
import { withTransaction } from '../../../core/database/transaction-context.js';
import Material from '../../materials/model/material.model.js';
import MaintenancePart from '../../maintenance/model/maintenance-part.model.js';
import PartManufacturer from '../model/part-manufacturer.model.js';

export default class ManufacturerRepository {
  async findAll(search) {
    return PartManufacturer.findAll({
      where: search ? { name: { [Op.like]: `%${search}%` } } : {},
      order: [['name', 'ASC']],
    });
  }
  async findByUuid(uuid, { transaction, withDeleted = false } = {}) {
    return PartManufacturer.findOne({
      where: { uuid },
      paranoid: !withDeleted,
      transaction,
    });
  }
  async findByIds(ids) {
    if (!ids.length) return [];
    return PartManufacturer.findAll({
      attributes: ['id', 'name'],
      where: { id: { [Op.in]: ids } },
      paranoid: false,
    });
  }
  async findByName(name, { transaction, withDeleted = false } = {}) {
    return PartManufacturer.findOne({
      where: { name },
      paranoid: !withDeleted,
      transaction,
    });
  }
  async create(values, { transaction } = {}) {
    return PartManufacturer.create(values, { transaction });
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
    return Material.count({ where: { manufacturerId }, transaction });
  }
  async countParts(manufacturerId, { transaction } = {}) {
    return MaintenancePart.count({ where: { manufacturerId }, transaction });
  }
  async updatePartNames(manufacturerId, name, { transaction } = {}) {
    return MaintenancePart.update(
      { manufacturer: name },
      { where: { manufacturerId }, transaction },
    );
  }
  withTransaction(callback) {
    return withTransaction(callback);
  }
}
