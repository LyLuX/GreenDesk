import MaterialRepository from '../repository/material.repository.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import BrandRepository from '../../brands/repository/brand.repository.js';
import CategoryRepository from '../../../core/database/repositories/category.repository.js';
import PropertyRepository from '../../../core/database/repositories/property.repository.js';

/** Business lifecycle for materials. */
export default class MaterialService {
  constructor(
    materialRepository = new MaterialRepository(),
    auditService = new AuditService(),
    brandRepository = new BrandRepository(),
    categoryRepository = new CategoryRepository(),
    propertyRepository = new PropertyRepository(),
  ) {
    this.materialRepository = materialRepository;
    this.auditService = auditService;
    this.brandRepository = brandRepository;
    this.categoryRepository = categoryRepository;
    this.propertyRepository = propertyRepository;
  }
  async getAll(query) {
    const result = await this.materialRepository.findAll(query);
    const limit = Math.min(Number(query.limit) || 25, 100);
    const page = Math.max(Number(query.page) || 1, 1);
    return {
      items: result.rows.map((item) => this.toPublic(item)),
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages: Math.max(Math.ceil(result.count / limit), 1),
      },
    };
  }
  async getByUuid(uuid) {
    return this.toPublic(await this.getEntityByUuid(uuid));
  }
  async getEntityByUuid(uuid) {
    const item = await this.materialRepository.findByUuid(uuid);
    if (!item) throw new AppError('Material not found', HTTP_STATUS.NOT_FOUND);
    return item;
  }
  async create(values, userId) {
    await this.ensureAvailable(values);
    this.ensureDatesAreCoherent(values);
    values = await this.resolveRelations(values);
    const item = await this.materialRepository.create({
      ...values,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.auditService.record({
      userId,
      action: 'CREATE',
      entity: 'MATERIAL',
      entityUuid: item.uuid,
      newValues: item.toJSON(),
    });
    return this.toPublic(item);
  }
  async update(uuid, values, userId) {
    const item = await this.getEntityByUuid(uuid);
    const oldValues = item.toJSON();
    await this.ensureAvailable(values, item.uuid);
    this.ensureDatesAreCoherent(values, item);
    values = await this.resolveRelations(values);
    await this.materialRepository.update(item, { ...values, updatedBy: userId });
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entity: 'MATERIAL',
      entityUuid: item.uuid,
      oldValues,
      newValues: item.toJSON(),
    });
    return this.toPublic(item);
  }
  async changeStatus(uuid, active, userId) {
    const item = await this.getEntityByUuid(uuid);
    const oldValues = item.toJSON();
    await this.materialRepository.update(item, { active, updatedBy: userId });
    await this.auditService.record({
      userId,
      action: 'STATUS_CHANGE',
      entity: 'MATERIAL',
      entityUuid: item.uuid,
      oldValues,
      newValues: item.toJSON(),
    });
    return this.toPublic(item);
  }
  async getHistory(uuid) {
    await this.getEntityByUuid(uuid);
    const events = await this.auditService.findByEntity('MATERIAL', uuid);
    return events.map((event) => {
      const value = event.toJSON();
      const publicValue = { ...value };
      delete publicValue.id;
      delete publicValue.userId;
      return publicValue;
    });
  }
  async ensureAvailable(values, currentUuid) {
    const isAnother = (item) => item && item.uuid !== currentUuid;
    if (values.name && isAnother(await this.materialRepository.findByName(values.name)))
      throw new AppError('Material name is already in use', HTTP_STATUS.CONFLICT);
    if (
      values.reference &&
      isAnother(await this.materialRepository.findByReference(values.reference))
    )
      throw new AppError('Material reference is already in use', HTTP_STATUS.CONFLICT);
    if (
      values.serialNumber &&
      isAnother(await this.materialRepository.findBySerialNumber(values.serialNumber))
    )
      throw new AppError('Material serial number is already in use', HTTP_STATUS.CONFLICT);
  }
  ensureDatesAreCoherent(values, item) {
    const purchaseDate = values.purchaseDate ?? item?.purchaseDate;
    const commissionedAt = values.commissionedAt ?? item?.commissionedAt;
    const retiredAt = values.retiredAt ?? item?.retiredAt;
    if (purchaseDate && commissionedAt && commissionedAt < purchaseDate)
      throw new AppError(
        'Commissioning date cannot be before purchase date',
        HTTP_STATUS.BAD_REQUEST,
      );
    if (commissionedAt && retiredAt && retiredAt < commissionedAt)
      throw new AppError(
        'Retirement date cannot be before commissioning date',
        HTTP_STATUS.BAD_REQUEST,
      );
  }
  toPublic(item) {
    const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
    const files = value.files;
    const publicValue = { ...value };
    delete publicValue.id;
    delete publicValue.brandId;
    delete publicValue.categoryId;
    delete publicValue.propertyId;
    delete publicValue.createdBy;
    delete publicValue.updatedBy;
    delete publicValue.files;
    return {
      ...publicValue,
      brand: value.brand ? { uuid: value.brand.uuid, name: value.brand.name } : null,
      category: value.category ? { uuid: value.category.uuid, name: value.category.name } : null,
      property: value.property ? { uuid: value.property.uuid, name: value.property.name } : null,
      ...(files
        ? {
            files: files.map((file) => {
              const publicFile = { ...file };
              delete publicFile.id;
              delete publicFile.materialId;
              return publicFile;
            }),
          }
        : {}),
    };
  }
  async resolveRelations(values) {
    const resolved = { ...values };
    if ('brandUuid' in resolved) {
      const brand = resolved.brandUuid
        ? await this.brandRepository.findByUuid(resolved.brandUuid)
        : null;
      if (resolved.brandUuid && !brand)
        throw new AppError('Brand not found', HTTP_STATUS.BAD_REQUEST);
      resolved.brandId = brand?.id ?? null;
      delete resolved.brandUuid;
    }
    if ('categoryUuid' in resolved) {
      const category = resolved.categoryUuid
        ? await this.categoryRepository.findByUuid(resolved.categoryUuid)
        : null;
      if (resolved.categoryUuid && !category)
        throw new AppError('Category not found', HTTP_STATUS.BAD_REQUEST);
      resolved.categoryId = category?.id ?? null;
      delete resolved.categoryUuid;
    }
    if ('propertyUuid' in resolved) {
      const property = resolved.propertyUuid
        ? await this.propertyRepository.findByUuid(resolved.propertyUuid)
        : null;
      if (resolved.propertyUuid && !property)
        throw new AppError('Property not found', HTTP_STATUS.BAD_REQUEST);
      resolved.propertyId = property?.id ?? null;
      delete resolved.propertyUuid;
    }
    return resolved;
  }
}
