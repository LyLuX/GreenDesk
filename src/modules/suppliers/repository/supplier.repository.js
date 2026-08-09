import { Op } from 'sequelize';

import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import MaintenancePart from '../../maintenance/model/maintenance-part.model.js';
import Supplier from '../model/supplier.model.js';

export default class SupplierRepository extends TransactionalRepository {
  findAll(search) {
    return Supplier.findAll({
      where: search ? { name: { [Op.like]: `%${search}%` } } : {},
      order: [['name', 'ASC']],
    });
  }
  findByUuid(uuid, { transaction, withDeleted = false } = {}) {
    return Supplier.findOne({
      where: { uuid },
      paranoid: !withDeleted,
      transaction,
    });
  }
  findByName(name, { transaction, withDeleted = false } = {}) {
    return Supplier.findOne({
      where: { name },
      paranoid: !withDeleted,
      transaction,
    });
  }
  create(values, { transaction } = {}) {
    return Supplier.create(values, { transaction });
  }
  update(item, values, { transaction } = {}) {
    return item.update(values, { transaction });
  }
  restore(item, { transaction } = {}) {
    return item.restore({ transaction });
  }
  delete(item, { transaction } = {}) {
    return item.destroy({ transaction });
  }
  countParts(supplierId, { transaction } = {}) {
    return MaintenancePart.count({ where: { supplierId }, transaction });
  }
  updatePartNames(supplierId, name, { transaction } = {}) {
    return MaintenancePart.update({ supplier: name }, { where: { supplierId }, transaction });
  }
}
