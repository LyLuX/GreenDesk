import { Op } from 'sequelize';

import sequelize from '../../../config/database.js';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import MaintenanceTask from '../model/maintenance-task.model.js';
import MaintenanceOperation from '../model/maintenance-operation.model.js';
import MaintenancePart from '../model/maintenance-part.model.js';
import MaintenancePartPriceHistory from '../model/maintenance-part-price-history.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import Supplier from '../../suppliers/model/supplier.model.js';
import User from '../../users/model/user.model.js';
import { STOCK_STATUSES } from '../../../core/inventory/stock-status.js';
import { LOW_STOCK_MAX_QUANTITY } from '../maintenance.constants.js';
import { companyValues, companyWhere } from '../../../core/company/company-context.js';

const manufacturerInclude = {
  model: PartManufacturer,
  as: 'manufacturerDirectory',
  attributes: ['uuid', 'name'],
};
const supplierInclude = {
  model: Supplier,
  as: 'supplierDirectory',
  attributes: ['uuid', 'name'],
};
const partDirectoryIncludes = [manufacturerInclude, supplierInclude];
const partCostAttributes = {
  include: [
    [
      sequelize.literal(`(
        SELECT COALESCE(SUM(usage_cost.total_cost), 0)
        FROM maintenance_part_usages AS usage_cost
        WHERE usage_cost.maintenance_part_id = MaintenancePart.id
      )`),
      'totalMaintenanceCost',
    ],
  ],
};

/** Persistence operations for reusable maintenance operations and exact parts. */
export default class MaintenanceCatalogRepository extends TransactionalRepository {
  findOperations({ search, active, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    const where = search ? { name: { [Op.like]: `%${search}%` } } : {};
    const normalizedActive = normalizeBooleanFilter(active);
    if (normalizedActive !== undefined) where.active = normalizedActive;
    return MaintenanceOperation.findAndCountAll({
      where: companyWhere(where),
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }

  findOperationByUuid(uuid, { transaction, withDeleted = false } = {}) {
    return MaintenanceOperation.findOne({
      where: companyWhere({ uuid }),
      paranoid: !withDeleted,
      transaction,
    });
  }

  findOperationByName(name, { transaction, withDeleted = false } = {}) {
    return MaintenanceOperation.findOne({
      where: companyWhere({ name }),
      paranoid: !withDeleted,
      transaction,
    });
  }

  createOperation(values, { transaction } = {}) {
    return MaintenanceOperation.create(companyValues(values), { transaction });
  }

  updateOperation(operation, values, { transaction } = {}) {
    return operation.update(values, { transaction });
  }

  restoreOperation(operation, { transaction } = {}) {
    return operation.restore({ transaction });
  }

  removeOperation(operation, { transaction } = {}) {
    return operation.destroy({ transaction });
  }

  countTasksForOperation(operationId, { transaction } = {}) {
    return MaintenanceTask.count({ where: companyWhere({ operationId }), transaction });
  }

  updateTasksForOperation(operationId, values, { transaction } = {}) {
    return MaintenanceTask.update(values, {
      where: companyWhere({ operationId }),
      transaction,
    });
  }

  findParts({ search, active, stockStatus, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    const where = search
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { reference: { [Op.like]: `%${search}%` } },
            { manufacturer: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};
    const normalizedActive = normalizeBooleanFilter(active);
    if (normalizedActive !== undefined) where.active = normalizedActive;
    if (stockStatus === STOCK_STATUSES.IN_STOCK) {
      where.quantityOnHand = { [Op.gt]: 0 };
    } else if (stockStatus === STOCK_STATUSES.ORDERED) {
      where.quantityOnHand = 0;
      where.quantityOnOrder = { [Op.gt]: 0 };
    } else if (stockStatus === STOCK_STATUSES.TO_ORDER) {
      where.quantityOnHand = 0;
      where.quantityOnOrder = 0;
    }
    return MaintenancePart.findAndCountAll({
      where: companyWhere(where),
      attributes: partCostAttributes,
      include: partDirectoryIncludes,
      order: [
        ['name', 'ASC'],
        ['manufacturer', 'ASC'],
        ['reference', 'ASC'],
      ],
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }

  findPartByUuid(uuid, { transaction, withDeleted = false, lock = false } = {}) {
    return MaintenancePart.findOne({
      where: companyWhere({ uuid }),
      attributes: partCostAttributes,
      paranoid: !withDeleted,
      include: partDirectoryIncludes,
      transaction,
      lock: lock ? transaction?.LOCK.UPDATE : undefined,
    });
  }

  findPartsByUuids(uuids, { transaction, lock = false } = {}) {
    return MaintenancePart.findAll({
      where: companyWhere({ uuid: { [Op.in]: uuids }, active: true }),
      include: partDirectoryIncludes,
      transaction,
      lock: lock ? transaction?.LOCK.UPDATE : undefined,
      order: [['id', 'ASC']],
    });
  }

  findPartsByIds(ids, { transaction, lock = false } = {}) {
    return MaintenancePart.findAll({
      where: companyWhere({ id: { [Op.in]: ids } }),
      transaction,
      lock: lock ? transaction?.LOCK.UPDATE : undefined,
      order: [['id', 'ASC']],
    });
  }

  findLowStockParts() {
    return MaintenancePart.findAll({
      where: companyWhere({
        active: true,
        quantityOnHand: { [Op.lte]: LOW_STOCK_MAX_QUANTITY },
      }),
      include: partDirectoryIncludes,
      order: [
        ['name', 'ASC'],
        ['manufacturer', 'ASC'],
        ['reference', 'ASC'],
      ],
    });
  }

  findPartByIdentity(
    reference,
    { manufacturerId = null, manufacturer = null } = {},
    { transaction, withDeleted = false } = {},
  ) {
    return MaintenancePart.findOne({
      where: companyWhere({
        reference,
        manufacturerId,
        ...(manufacturerId ? {} : { manufacturer: manufacturer || null }),
      }),
      paranoid: !withDeleted,
      transaction,
    });
  }

  createPart(values, { transaction } = {}) {
    return MaintenancePart.create(companyValues(values), { transaction });
  }

  updatePart(part, values, { transaction } = {}) {
    return part.update(values, { transaction });
  }

  createPartPriceHistory(values, { transaction } = {}) {
    return MaintenancePartPriceHistory.create(companyValues(values), { transaction });
  }

  findPartPriceHistory(maintenancePartId, { page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    return MaintenancePartPriceHistory.findAndCountAll({
      where: companyWhere({ maintenancePartId }),
      include: [
        {
          model: User,
          as: 'changedByUser',
          attributes: ['uuid', 'firstName', 'lastName'],
        },
      ],
      order: [
        ['performedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: pagination.limit,
      offset: pagination.offset,
    });
  }

  restorePart(part, { transaction } = {}) {
    return part.restore({ transaction });
  }

  removePart(part, { transaction } = {}) {
    return part.destroy({ transaction });
  }

  countTasksForPart(partId, { transaction } = {}) {
    return MaintenanceTask.count({
      where: companyWhere(),
      include: [
        {
          model: MaintenancePart,
          as: 'parts',
          where: { id: partId },
          required: true,
          through: { attributes: [] },
        },
      ],
      distinct: true,
      transaction,
    });
  }
}
