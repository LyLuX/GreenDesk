import { Op } from 'sequelize';

import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import MaintenancePart from '../../maintenance/model/maintenance-part.model.js';
import Supplier from '../model/supplier.model.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import { companyValues, companyWhere } from '../../../core/company/company-context.js';

export default class SupplierRepository extends TransactionalRepository {
  findAll({ search, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    return Supplier.findAndCountAll({
      where: companyWhere(search ? { name: { [Op.like]: `%${search}%` } } : {}),
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }
  findByUuid(uuid, { transaction, withDeleted = false } = {}) {
    return Supplier.findOne({
      where: companyWhere({ uuid }),
      paranoid: !withDeleted,
      transaction,
    });
  }
  findByName(name, { transaction, withDeleted = false } = {}) {
    return Supplier.findOne({
      where: companyWhere({ name }),
      paranoid: !withDeleted,
      transaction,
    });
  }
  create(values, { transaction } = {}) {
    return Supplier.create(companyValues(values), { transaction });
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
    return MaintenancePart.count({ where: companyWhere({ supplierId }), transaction });
  }
  updatePartNames(supplierId, name, { transaction } = {}) {
    return MaintenancePart.update(
      { supplier: name },
      { where: companyWhere({ supplierId }), transaction },
    );
  }
}
