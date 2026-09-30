import { Op } from 'sequelize';

import sequelize from '../../../config/database.js';
import CompanyScopedRepository from '../../../core/database/repositories/company-scoped.repository.js';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import MaintenanceTask from '../model/maintenance-task.model.js';
import MaintenanceOperation from '../model/maintenance-operation.model.js';
import MaintenancePart from '../model/maintenance-part.model.js';
import MaintenancePartPriceHistory from '../model/maintenance-part-price-history.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import Supplier from '../../suppliers/model/supplier.model.js';
import User from '../../users/model/user.model.js';
import { STOCK_FILTERS, STOCK_STATUSES } from '../../../core/inventory/stock-status.js';
import {
  requireCompanyInstance,
  companyValues,
  companyWhere,
} from '../../../core/company/company-context.js';

const manufacturerInclude = {
  model: PartManufacturer,
  as: 'manufacturerDirectory',
  attributes: ['uuid', 'name', 'logoFileName'],
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
export default class MaintenanceCatalogRepository extends CompanyScopedRepository {
  async findPartSuggestions() {
    const entries = await Promise.all(
      ['name', 'unit'].map(async (field) => {
        const rows = await MaintenancePart.findAll({
          attributes: [field],
          where: companyWhere(),
          group: [field],
          order: [[field, 'ASC']],
          raw: true,
        });
        return [field, rows.map((row) => row[field]).filter(Boolean)];
      }),
    );
    return Object.fromEntries(entries);
  }

  findOperations({ search, active, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    const where = search ? { name: { [Op.like]: `%${search}%` } } : {};
    const normalizedActive = normalizeBooleanFilter(active, true);
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
    requireCompanyInstance(operation);
    return operation.update(companyValues(values), { transaction });
  }

  restoreOperation(operation, { transaction } = {}) {
    requireCompanyInstance(operation);
    return operation.restore({ transaction });
  }

  removeOperation(operation, { transaction } = {}) {
    requireCompanyInstance(operation);
    return operation.destroy({ transaction });
  }

  countTasksForOperation(operationId, { transaction } = {}) {
    return MaintenanceTask.count({ where: companyWhere({ operationId }), transaction });
  }

  updateTasksForOperation(operationId, values, { transaction } = {}) {
    return MaintenanceTask.update(companyValues(values), {
      where: companyWhere({ operationId }),
      transaction,
    });
  }

  findParts({ search, active, stockStatus, partUuid, page, limit } = {}) {
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
    const normalizedActive = normalizeBooleanFilter(active, true);
    if (normalizedActive !== undefined) where.active = normalizedActive;
    if (partUuid) where.uuid = partUuid;
    if (stockStatus === STOCK_STATUSES.IN_STOCK) {
      where[Op.and] = [
        sequelize.where(
          sequelize.col('quantity_on_hand'),
          Op.gt,
          sequelize.col('minimum_stock_quantity'),
        ),
      ];
    } else if (stockStatus === STOCK_FILTERS.MINIMUM) {
      where[Op.and] = [
        sequelize.where(
          sequelize.col('quantity_on_hand'),
          Op.eq,
          sequelize.col('minimum_stock_quantity'),
        ),
        sequelize.literal(
          'NOT (minimum_stock_quantity = 0 AND quantity_on_hand = 0 AND quantity_on_order > 0)',
        ),
      ];
    } else if (stockStatus === STOCK_STATUSES.ORDERED) {
      where[Op.or] = [
        {
          [Op.and]: [
            sequelize.where(
              sequelize.col('quantity_on_hand'),
              Op.lt,
              sequelize.col('minimum_stock_quantity'),
            ),
            sequelize.where(
              sequelize.literal('quantity_on_hand + quantity_on_order'),
              Op.gte,
              sequelize.col('minimum_stock_quantity'),
            ),
          ],
        },
        sequelize.literal(
          'minimum_stock_quantity = 0 AND quantity_on_hand = 0 AND quantity_on_order > 0',
        ),
      ];
    } else if (stockStatus === STOCK_STATUSES.TO_ORDER) {
      where[Op.and] = [
        sequelize.where(
          sequelize.literal('quantity_on_hand + quantity_on_order'),
          Op.lt,
          sequelize.col('minimum_stock_quantity'),
        ),
      ];
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
        [Op.and]: [
          sequelize.where(
            sequelize.col('quantity_on_hand'),
            Op.lte,
            sequelize.col('minimum_stock_quantity'),
          ),
        ],
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
    requireCompanyInstance(part);
    return part.update(companyValues(values), { transaction });
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
    requireCompanyInstance(part);
    return part.restore({ transaction });
  }

  removePart(part, { transaction } = {}) {
    requireCompanyInstance(part);
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
