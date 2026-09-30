import { Op } from 'sequelize';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';

import CompanyScopedRepository from '../../../core/database/repositories/company-scoped.repository.js';
import MaintenancePart from '../../maintenance/model/maintenance-part.model.js';
import Supplier from '../model/supplier.model.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import {
  requireCompanyInstance,
  companyValues,
  companyWhere,
} from '../../../core/company/company-context.js';

export default class SupplierRepository extends CompanyScopedRepository {
  findAll({ search, active, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    const where = search ? { name: { [Op.like]: `%${search}%` } } : {};
    const normalizedActive = normalizeBooleanFilter(active, true);
    if (normalizedActive !== undefined) where.active = normalizedActive;
    return Supplier.findAndCountAll({
      where: companyWhere(where),
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
    requireCompanyInstance(item);
    return item.update(companyValues(values), { transaction });
  }
  restore(item, { transaction } = {}) {
    requireCompanyInstance(item);
    return item.restore({ transaction });
  }
  delete(item, { transaction } = {}) {
    requireCompanyInstance(item);
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
