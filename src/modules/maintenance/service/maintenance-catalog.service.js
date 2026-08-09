import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import { STOCK_STATUSES } from '../../../core/inventory/stock-status.js';
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
  ) {
    this.repository = repository;
    this.auditService = auditService;
    this.manufacturerRepository = manufacturerRepository;
    this.supplierRepository = supplierRepository;
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
      const partValues = this.prepareInventoryValues(
        await this.preparePartValues(values, transaction),
      );
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
      const partValues = this.prepareInventoryValues(
        await this.preparePartValues(values, transaction, part),
        part,
      );
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
    return this.updatePart(uuid, values, userId);
  }

  prepareInventoryValues(values, currentPart = null) {
    const partValues = { ...values };
    const stockStatus =
      partValues.stockStatus ?? currentPart?.stockStatus ?? STOCK_STATUSES.TO_ORDER;
    let stockQuantity = Object.hasOwn(partValues, 'stockQuantity')
      ? Number(partValues.stockQuantity)
      : Number(currentPart?.stockQuantity ?? 0);

    if (stockStatus === STOCK_STATUSES.TO_ORDER) stockQuantity = 0;
    if (stockStatus !== STOCK_STATUSES.TO_ORDER && stockQuantity < 1) {
      throw new AppError(
        'Une quantité positive est requise pour une pièce commandée ou en stock atelier.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    partValues.stockStatus = stockStatus;
    partValues.stockQuantity = stockQuantity;
    return partValues;
  }

  async preparePartValues(values, transaction, currentPart = null) {
    const partValues = { ...values };
    delete partValues.manufacturerUuid;
    delete partValues.supplierUuid;

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
      ? { ...publicValue, manufacturerUuid, supplierUuid }
      : publicValue;
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
