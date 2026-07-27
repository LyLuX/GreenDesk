import { Op } from 'sequelize';

import sequelize from '../../../config/database.js';
import MaintenanceTask from '../model/maintenance-task.model.js';
import MaintenanceOperation from '../model/maintenance-operation.model.js';
import MaintenancePart from '../model/maintenance-part.model.js';
import MaintenancePartManufacturer from '../model/maintenance-part-manufacturer.model.js';
import MaintenanceSupplier from '../model/maintenance-supplier.model.js';

const manufacturerInclude = {
  model: MaintenancePartManufacturer,
  as: 'manufacturerDirectory',
  attributes: ['uuid', 'name'],
};
const supplierInclude = {
  model: MaintenanceSupplier,
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

  findPartByUuid(uuid, { transaction, withDeleted = false } = {}) {
    return MaintenancePart.findOne({
      where: { uuid },
      paranoid: !withDeleted,
      include: partDirectoryIncludes,
      transaction,
    });
  }

  findPartsByUuids(uuids, { transaction } = {}) {
    return MaintenancePart.findAll({
      where: { uuid: { [Op.in]: uuids }, active: true },
      include: partDirectoryIncludes,
      transaction,
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

  findManufacturers() {
    return MaintenancePartManufacturer.findAll({ order: [['name', 'ASC']] });
  }

  findManufacturerByUuid(uuid, { transaction, withDeleted = false } = {}) {
    return MaintenancePartManufacturer.findOne({
      where: { uuid },
      paranoid: !withDeleted,
      transaction,
    });
  }

  findManufacturerByName(name, { transaction, withDeleted = false } = {}) {
    return MaintenancePartManufacturer.findOne({
      where: { name },
      paranoid: !withDeleted,
      transaction,
    });
  }

  createManufacturer(values, { transaction } = {}) {
    return MaintenancePartManufacturer.create(values, { transaction });
  }

  updateManufacturer(manufacturer, values, { transaction } = {}) {
    return manufacturer.update(values, { transaction });
  }

  restoreManufacturer(manufacturer, { transaction } = {}) {
    return manufacturer.restore({ transaction });
  }

  removeManufacturer(manufacturer, { transaction } = {}) {
    return manufacturer.destroy({ transaction });
  }

  countPartsForManufacturer(manufacturerId, { transaction } = {}) {
    return MaintenancePart.count({ where: { manufacturerId }, transaction });
  }

  updatePartsForManufacturer(manufacturerId, name, { transaction } = {}) {
    return MaintenancePart.update(
      { manufacturer: name },
      { where: { manufacturerId }, transaction },
    );
  }

  findSuppliers() {
    return MaintenanceSupplier.findAll({ order: [['name', 'ASC']] });
  }

  findSupplierByUuid(uuid, { transaction, withDeleted = false } = {}) {
    return MaintenanceSupplier.findOne({
      where: { uuid },
      paranoid: !withDeleted,
      transaction,
    });
  }

  findSupplierByName(name, { transaction, withDeleted = false } = {}) {
    return MaintenanceSupplier.findOne({
      where: { name },
      paranoid: !withDeleted,
      transaction,
    });
  }

  createSupplier(values, { transaction } = {}) {
    return MaintenanceSupplier.create(values, { transaction });
  }

  updateSupplier(supplier, values, { transaction } = {}) {
    return supplier.update(values, { transaction });
  }

  restoreSupplier(supplier, { transaction } = {}) {
    return supplier.restore({ transaction });
  }

  removeSupplier(supplier, { transaction } = {}) {
    return supplier.destroy({ transaction });
  }

  countPartsForSupplier(supplierId, { transaction } = {}) {
    return MaintenancePart.count({ where: { supplierId }, transaction });
  }

  updatePartsForSupplier(supplierId, name, { transaction } = {}) {
    return MaintenancePart.update({ supplier: name }, { where: { supplierId }, transaction });
  }

  withTransaction(callback) {
    return sequelize.transaction(callback);
  }
}
