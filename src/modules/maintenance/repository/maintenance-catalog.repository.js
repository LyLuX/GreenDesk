import { Op } from 'sequelize';

import { withTransaction } from '../../../core/database/transaction-context.js';
import MaintenanceTask from '../model/maintenance-task.model.js';
import MaintenanceOperation from '../model/maintenance-operation.model.js';
import MaintenancePart from '../model/maintenance-part.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import Supplier from '../../suppliers/model/supplier.model.js';

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

/** Persistence operations for reusable maintenance operations and exact parts. */
export default class MaintenanceCatalogRepository {
  findOperations() {
    return MaintenanceOperation.findAll({ order: [['name', 'ASC']] });
  }

  findOperationByUuid(uuid, { transaction, withDeleted = false } = {}) {
    return MaintenanceOperation.findOne({
      where: { uuid },
      paranoid: !withDeleted,
      transaction,
    });
  }

  findOperationByName(name, { transaction, withDeleted = false } = {}) {
    return MaintenanceOperation.findOne({
      where: { name },
      paranoid: !withDeleted,
      transaction,
    });
  }

  createOperation(values, { transaction } = {}) {
    return MaintenanceOperation.create(values, { transaction });
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
    return MaintenanceTask.count({ where: { operationId }, transaction });
  }

  updateTasksForOperation(operationId, values, { transaction } = {}) {
    return MaintenanceTask.update(values, { where: { operationId }, transaction });
  }

  findParts() {
    return MaintenancePart.findAll({
      include: partDirectoryIncludes,
      order: [
        ['name', 'ASC'],
        ['manufacturer', 'ASC'],
        ['reference', 'ASC'],
      ],
    });
  }

  findPartByUuid(uuid, { transaction, withDeleted = false, lock = false } = {}) {
    return MaintenancePart.findOne({
      where: { uuid },
      paranoid: !withDeleted,
      include: partDirectoryIncludes,
      transaction,
      lock: lock ? transaction?.LOCK.UPDATE : undefined,
    });
  }

  findPartsByUuids(uuids, { transaction } = {}) {
    return MaintenancePart.findAll({
      where: { uuid: { [Op.in]: uuids }, active: true },
      include: partDirectoryIncludes,
      transaction,
    });
  }

  findPartsByIds(ids, { transaction, lock = false } = {}) {
    return MaintenancePart.findAll({
      where: { id: { [Op.in]: ids } },
      transaction,
      lock: lock ? transaction?.LOCK.UPDATE : undefined,
      order: [['id', 'ASC']],
    });
  }

  findPartByIdentity(
    reference,
    { manufacturerId = null, manufacturer = null } = {},
    { transaction, withDeleted = false } = {},
  ) {
    return MaintenancePart.findOne({
      where: {
        reference,
        manufacturerId,
        ...(manufacturerId ? {} : { manufacturer: manufacturer || null }),
      },
      paranoid: !withDeleted,
      transaction,
    });
  }

  createPart(values, { transaction } = {}) {
    return MaintenancePart.create(values, { transaction });
  }

  updatePart(part, values, { transaction } = {}) {
    return part.update(values, { transaction });
  }

  restorePart(part, { transaction } = {}) {
    return part.restore({ transaction });
  }

  removePart(part, { transaction } = {}) {
    return part.destroy({ transaction });
  }

  countTasksForPart(partId, { transaction } = {}) {
    return MaintenanceTask.count({
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

  withTransaction(callback) {
    return withTransaction(callback);
  }
}
