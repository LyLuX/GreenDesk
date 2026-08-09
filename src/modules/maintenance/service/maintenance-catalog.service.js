import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import StockService from '../../../core/inventory/stock.service.js';
import { STOCK_OPERATIONS, STOCKABLE_TYPES } from '../../../core/inventory/stock-operation.js';
import { STOCK_STATUSES, getStockAvailability } from '../../../core/inventory/stock-status.js';
import AuditService from '../../audit/service/audit.service.js';
import ManufacturerRepository from '../../manufacturers/repository/manufacturer.repository.js';
import SupplierRepository from '../../suppliers/repository/supplier.repository.js';
import MaintenanceCatalogRepository from '../repository/maintenance-catalog.repository.js';

/** Reusable operation and exact-part catalogue lifecycle. */
export default class MaintenanceCatalogService {
  constructor(
    repository = new MaintenanceCatalogRepository(),
    auditService = new AuditService(),
    manufacturerRepository = new ManufacturerRepository(),
    supplierRepository = new SupplierRepository(),
    stockService = new StockService(),
  ) {
    this.repository = repository;
    this.auditService = auditService;
    this.manufacturerRepository = manufacturerRepository;
    this.supplierRepository = supplierRepository;
    this.stockService = stockService;
  }

  async getOperations() {
    return (await this.repository.findOperations()).map((item) => this.toPublic(item));
  }

  async getOperationEntity(uuid, options) {
    const operation = await this.repository.findOperationByUuid(uuid, options);
    if (!operation)
      throw new AppError('Opération de maintenance introuvable.', HTTP_STATUS.NOT_FOUND);
    return operation;
  }

  async createOperation(values, userId) {
    const existing = await this.repository.findOperationByName(values.name, {
      withDeleted: true,
    });
    if (existing && !existing.deletedAt)
      throw new AppError('Cette opération existe déjà.', HTTP_STATUS.CONFLICT);

    const operation = await this.repository.withTransaction(async (transaction) => {
      if (existing) {
        await this.repository.restoreOperation(existing, { transaction });
        return this.repository.updateOperation(
          existing,
          { ...values, active: true, updatedBy: userId },
          { transaction },
        );
      }
      return this.repository.createOperation(
        { ...values, createdBy: userId, updatedBy: userId },
        { transaction },
      );
    });
    await this.record(userId, existing ? 'RESTORE' : 'CREATE', 'MAINTENANCE_OPERATION', operation);
    return this.toPublic(operation);
  }

  async updateOperation(uuid, values, userId) {
    const operation = await this.getOperationEntity(uuid);
    if (values.name) {
      const duplicate = await this.repository.findOperationByName(values.name);
      if (duplicate && duplicate.uuid !== operation.uuid) {
        throw new AppError('Cette opération existe déjà.', HTTP_STATUS.CONFLICT);
      }
    }
    const oldValues = this.toPublic(operation);
    await this.repository.withTransaction(async (transaction) => {
      await this.repository.updateOperation(
        operation,
        { ...values, updatedBy: userId },
        { transaction },
      );
      if (values.name || values.maintenanceType) {
        await this.repository.updateTasksForOperation(
          operation.id,
          {
            title: operation.name,
            maintenanceType: operation.maintenanceType,
          },
          { transaction },
        );
      }
    });
    await this.record(userId, 'UPDATE', 'MAINTENANCE_OPERATION', operation, oldValues);
    return this.toPublic(operation);
  }

  async removeOperation(uuid, userId) {
    const operation = await this.getOperationEntity(uuid);
    if (await this.repository.countTasksForOperation(operation.id)) {
      throw new AppError('Cette opération est encore utilisée par un plan.', HTTP_STATUS.CONFLICT);
    }
    const oldValues = this.toPublic(operation);
    await this.repository.removeOperation(operation);
    await this.record(userId, 'DELETE', 'MAINTENANCE_OPERATION', operation, oldValues);
  }

  async getParts() {
    return (await this.repository.findParts()).map((item) => this.toPublic(item));
  }

  async getPartEntity(uuid, options) {
    const part = await this.repository.findPartByUuid(uuid, options);
    if (!part) throw new AppError('Pièce introuvable.', HTTP_STATUS.NOT_FOUND);
    return part;
  }

  async createPart(values, userId) {
    const prepared = await this.repository.withTransaction(async (transaction) => {
      const partValues = await this.preparePartValues(values, transaction);
      const existing = await this.repository.findPartByIdentity(
        partValues.reference,
        {
          manufacturerId: partValues.manufacturerId,
          manufacturer: partValues.manufacturer,
        },
        { transaction, withDeleted: true },
      );
      if (existing && !existing.deletedAt) {
        throw new AppError('Cette référence existe déjà pour ce fabricant.', HTTP_STATUS.CONFLICT);
      }
      if (existing) {
        await this.repository.restorePart(existing, { transaction });
        const part = await this.repository.updatePart(
          existing,
          { ...partValues, active: true, updatedBy: userId },
          { transaction },
        );
        return { part, restored: true };
      }
      const part = await this.repository.createPart(
        { ...partValues, createdBy: userId, updatedBy: userId },
        { transaction },
      );
      return { part, restored: false };
    });
    await this.record(
      userId,
      prepared.restored ? 'RESTORE' : 'CREATE',
      'MAINTENANCE_PART',
      prepared.part,
    );
    return this.toPublic(await this.repository.findPartByUuid(prepared.part.uuid));
  }

  async updatePart(uuid, values, userId) {
    const part = await this.getPartEntity(uuid);
    const oldValues = this.toPublic(part);
    await this.repository.withTransaction(async (transaction) => {
      const partValues = await this.preparePartValues(values, transaction, part);
      const nextReference = partValues.reference ?? part.reference;
      const nextManufacturerId = Object.hasOwn(partValues, 'manufacturerId')
        ? partValues.manufacturerId
        : part.manufacturerId;
      const nextManufacturer = Object.hasOwn(partValues, 'manufacturer')
        ? partValues.manufacturer
        : part.manufacturer;
      if (
        nextReference !== part.reference ||
        nextManufacturerId !== part.manufacturerId ||
        nextManufacturer !== part.manufacturer
      ) {
        const duplicate = await this.repository.findPartByIdentity(
          nextReference,
          {
            manufacturerId: nextManufacturerId,
            manufacturer: nextManufacturer,
          },
          { transaction },
        );
        if (duplicate && duplicate.uuid !== part.uuid) {
          throw new AppError(
            'Cette référence existe déjà pour ce fabricant.',
            HTTP_STATUS.CONFLICT,
          );
        }
      }
      await this.repository.updatePart(part, { ...partValues, updatedBy: userId }, { transaction });
    });
    await this.record(userId, 'UPDATE', 'MAINTENANCE_PART', part, oldValues);
    return this.toPublic(await this.repository.findPartByUuid(part.uuid));
  }

  async updatePartStock(uuid, values, userId) {
    let part;
    let oldValues;
    await this.repository.withTransaction(async (transaction) => {
      part = await this.getPartEntity(uuid, { transaction, lock: true });
      oldValues = this.toPublic(part);
      await this.stockService.apply(
        part,
        {
          stockableType: STOCKABLE_TYPES.MAINTENANCE_PART,
          ...this.normalizeStockOperation(values),
          userId,
        },
        { transaction },
      );
    });
    await this.record(userId, 'STOCK_UPDATE', 'MAINTENANCE_PART', part, oldValues);
    return this.toPublic(await this.repository.findPartByUuid(part.uuid));
  }

  async getPartStockMovements(uuid, query = {}) {
    const part = await this.getPartEntity(uuid);
    const result = await this.stockService.getMovements(
      STOCKABLE_TYPES.MAINTENANCE_PART,
      part.id,
      query,
    );
    return {
      items: result.items.map((movement) => this.toPublicStockMovement(movement)),
      pagination: result.pagination,
    };
  }

  normalizeStockOperation(values) {
    if (values.operation) return values;
    if (values.stockStatus === STOCK_STATUSES.IN_STOCK) {
      return {
        operation: STOCK_OPERATIONS.ADJUST,
        quantityOnHand: values.stockQuantity,
        quantityOnOrder: 0,
      };
    }
    if (values.stockStatus === STOCK_STATUSES.ORDERED) {
      return {
        operation: STOCK_OPERATIONS.ADJUST,
        quantityOnHand: 0,
        quantityOnOrder: values.stockQuantity,
      };
    }
    return {
      operation: STOCK_OPERATIONS.ADJUST,
      quantityOnHand: 0,
      quantityOnOrder: 0,
    };
  }

  async preparePartValues(values, transaction, currentPart = null) {
    const partValues = { ...values };
    delete partValues.manufacturerUuid;
    delete partValues.supplierUuid;
    delete partValues.stockStatus;
    delete partValues.stockQuantity;
    delete partValues.quantityOnHand;
    delete partValues.quantityOnOrder;

    if (Object.hasOwn(values, 'manufacturerUuid')) {
      const manufacturer = values.manufacturerUuid
        ? await this.getManufacturerEntity(values.manufacturerUuid, {
            transaction,
            allowInactive: values.manufacturerUuid === currentPart?.manufacturerDirectory?.uuid,
          })
        : null;
      partValues.manufacturerId = manufacturer?.id ?? null;
      partValues.manufacturer = manufacturer?.name ?? null;
    } else if (Object.hasOwn(values, 'manufacturer')) {
      const manufacturer = values.manufacturer
        ? await this.manufacturerRepository.findByName(values.manufacturer, { transaction })
        : null;
      partValues.manufacturerId = manufacturer?.id ?? null;
      partValues.manufacturer = values.manufacturer || null;
    }

    if (Object.hasOwn(values, 'supplierUuid')) {
      const supplier = values.supplierUuid
        ? await this.getSupplierEntity(values.supplierUuid, {
            transaction,
            allowInactive: values.supplierUuid === currentPart?.supplierDirectory?.uuid,
          })
        : null;
      partValues.supplierId = supplier?.id ?? null;
      partValues.supplier = supplier?.name ?? null;
    }
    return partValues;
  }

  async getManufacturerEntity(uuid, { allowInactive = true, ...options } = {}) {
    const manufacturer = await this.manufacturerRepository.findByUuid(uuid, options);
    if (!manufacturer || (!allowInactive && !manufacturer.active)) {
      throw new AppError('Fabricant de pièce introuvable ou inactif.', HTTP_STATUS.NOT_FOUND);
    }
    return manufacturer;
  }

  async getSupplierEntity(uuid, { allowInactive = true, ...options } = {}) {
    const supplier = await this.supplierRepository.findByUuid(uuid, options);
    if (!supplier || (!allowInactive && !supplier.active)) {
      throw new AppError('Fournisseur introuvable ou inactif.', HTTP_STATUS.NOT_FOUND);
    }
    return supplier;
  }

  async removePart(uuid, userId) {
    const part = await this.getPartEntity(uuid);
    if (await this.repository.countTasksForPart(part.id)) {
      throw new AppError('Cette pièce est encore utilisée par un plan.', HTTP_STATUS.CONFLICT);
    }
    const oldValues = this.toPublic(part);
    await this.repository.removePart(part);
    await this.record(userId, 'DELETE', 'MAINTENANCE_PART', part, oldValues);
  }

  toPublic(item) {
    const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
    const publicValue = { ...value };
    const manufacturerUuid = value.manufacturerDirectory?.uuid ?? null;
    const supplierUuid = value.supplierDirectory?.uuid ?? null;
    delete publicValue.id;
    delete publicValue.manufacturerId;
    delete publicValue.supplierId;
    delete publicValue.manufacturerDirectory;
    delete publicValue.supplierDirectory;
    delete publicValue.createdBy;
    delete publicValue.updatedBy;
    return Object.hasOwn(value, 'reference')
      ? {
          ...publicValue,
          quantityOnHand: Number(value.quantityOnHand ?? 0),
          quantityOnOrder: Number(value.quantityOnOrder ?? 0),
          stockStatus: getStockAvailability(value).status,
          stockQuantity: Number(value.quantityOnHand ?? 0) + Number(value.quantityOnOrder ?? 0),
          manufacturerUuid,
          supplierUuid,
        }
      : publicValue;
  }

  toPublicStockMovement(item) {
    const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
    return {
      uuid: value.uuid,
      operation: value.operation,
      quantityOnHandChange: Number(value.quantityOnHandChange),
      quantityOnOrderChange: Number(value.quantityOnOrderChange),
      quantityOnHandAfter: Number(value.quantityOnHandAfter),
      quantityOnOrderAfter: Number(value.quantityOnOrderAfter),
      sourceType: value.sourceType,
      sourceUuid: value.sourceUuid,
      createdAt: value.createdAt,
    };
  }

  record(userId, action, entity, item, oldValues) {
    return this.auditService.record({
      userId,
      action,
      entity,
      entityUuid: item.uuid,
      ...(oldValues ? { oldValues } : {}),
      ...(action !== 'DELETE' ? { newValues: this.toPublic(item) } : {}),
    });
  }
}
