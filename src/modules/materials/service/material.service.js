import MaterialRepository from '../repository/material.repository.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import ManufacturerRepository from '../../manufacturers/repository/manufacturer.repository.js';
import CategoryRepository from '../../../core/database/repositories/category.repository.js';

const relationIds = (events, keys) => [
  ...new Set(
    events.flatMap((event) => {
      const value = typeof event.toJSON === 'function' ? event.toJSON() : event;
      return [value.oldValues, value.newValues]
        .filter(Boolean)
        .flatMap((snapshot) => keys.map((key) => snapshot[key]))
        .filter((id) => id !== null && id !== undefined);
    }),
  ),
];

const nameMap = (items = []) =>
  new Map(
    items.map((item) => {
      const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
      return [String(value.id), value.name];
    }),
  );

const has = (object, key) => Object.hasOwn(object, key);

const auditValue = (event) => (typeof event.toJSON === 'function' ? event.toJSON() : event);

const publicAuditSnapshot = (snapshot, manufacturerNames, categoryNames) => {
  if (!snapshot) return snapshot;
  const values = { ...snapshot };
  const manufacturerId = values.manufacturerId ?? values.brandId;
  const categoryId = values.categoryId;

  delete values.id;
  delete values.manufacturerId;
  delete values.brandId;
  delete values.categoryId;
  delete values.createdBy;
  delete values.updatedBy;

  if (manufacturerId !== undefined) {
    values.manufacturer =
      manufacturerId === null
        ? null
        : (manufacturerNames.get(String(manufacturerId)) ?? 'Fabricant inconnu');
  }
  if (categoryId !== undefined) {
    values.category =
      categoryId === null ? null : (categoryNames.get(String(categoryId)) ?? 'Catégorie inconnue');
  }
  if (values.purchasePrice !== undefined && Number.isFinite(Number(values.purchasePrice))) {
    values.purchasePrice = Number(values.purchasePrice);
  }
  return values;
};

/** Parses a DATEONLY value as UTC and rejects invalid calendar values. */
export function parseDateOnly(value) {
  if (!value) return null;
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    throw new AppError('La date fournie est invalide.', HTTP_STATUS.BAD_REQUEST);
  const parsed = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text)
    throw new AppError('La date fournie est invalide.', HTTP_STATUS.BAD_REQUEST);
  return parsed;
}

/** Business lifecycle for materials. */
export default class MaterialService {
  constructor(
    materialRepository = new MaterialRepository(),
    auditService = new AuditService(),
    manufacturerRepository = new ManufacturerRepository(),
    categoryRepository = new CategoryRepository(),
  ) {
    this.materialRepository = materialRepository;
    this.auditService = auditService;
    this.manufacturerRepository = manufacturerRepository;
    this.categoryRepository = categoryRepository;
  }
  async getAll(query) {
    const result = await this.materialRepository.findAll({
      ...query,
      manufacturerUuid: query.manufacturerUuid ?? query.brandUuid,
    });
    const showAll = query.limit === 'all';
    const limit = showAll ? Math.max(result.count, 1) : Math.min(Number(query.limit) || 5, 100);
    const page = showAll ? 1 : Math.max(Number(query.page) || 1, 1);
    return {
      items: result.rows.map((item) => this.toPublic(item)),
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages: showAll ? 1 : Math.max(Math.ceil(result.count / limit), 1),
      },
    };
  }
  async getOptions() {
    const items = await this.materialRepository.findOptions();
    return items.map((item) => {
      const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
      return { uuid: value.uuid, name: value.name, active: value.active };
    });
  }
  async getByUuid(uuid) {
    return this.toPublic(await this.getEntityByUuid(uuid));
  }
  async getEntityByUuid(uuid, options = {}) {
    const item = await this.materialRepository.findByUuid(uuid, options);
    if (!item) throw new AppError('Material not found', HTTP_STATUS.NOT_FOUND);
    return item;
  }
  async create(values, userId) {
    await this.ensureAvailable(values);
    this.ensureDatesAreCoherent(values);
    const deletedMaterial = await this.findDeletedMaterial(values);
    values = await this.resolveRelations(values);
    const oldValues = deletedMaterial?.toJSON();
    if (deletedMaterial) {
      await this.materialRepository.restore(deletedMaterial);
      await this.materialRepository.update(deletedMaterial, {
        ...values,
        active: true,
        updatedBy: userId,
      });
    }
    const item =
      deletedMaterial ??
      (await this.materialRepository.create({
        ...values,
        createdBy: userId,
        updatedBy: userId,
      }));
    await this.auditService.record({
      userId,
      action: deletedMaterial ? 'RESTORE' : 'CREATE',
      entity: 'MATERIAL',
      entityUuid: item.uuid,
      ...(oldValues ? { oldValues } : {}),
      newValues: item.toJSON(),
    });
    return this.toPublic(item);
  }
  async update(uuid, values, userId) {
    let item = await this.getEntityByUuid(uuid);
    let oldValues;
    await this.ensureAvailable(values, item.uuid);
    this.ensureDatesAreCoherent(values, item);
    values = await this.resolveRelations(values);
    await this.materialRepository.withTransaction(async (transaction) => {
      item = await this.getEntityByUuid(uuid, { transaction, lock: true });
      oldValues = item.toJSON();
      this.ensureDatesAreCoherent(values, item);
      const changesActiveState = has(values, 'active') && values.active !== item.active;
      const reactivatesMaterial = changesActiveState && values.active === true;
      const deactivationTimestamps = reactivatesMaterial
        ? await this.findDeactivationTimestamps(item)
        : [];
      await this.materialRepository.update(item, { ...values, updatedBy: userId }, { transaction });
      if (changesActiveState && values.active === false) {
        await this.materialRepository.deactivateMaintenanceTasks(item.id, item.updatedAt, userId, {
          transaction,
        });
      }
      if (reactivatesMaterial) {
        await this.materialRepository.reactivateMaintenanceTasks(
          item.id,
          deactivationTimestamps,
          userId,
          { transaction },
        );
      }
    });
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
  async remove(uuid, userId) {
    let item;
    let oldValues;
    await this.materialRepository.withTransaction(async (transaction) => {
      item = await this.getEntityByUuid(uuid, { transaction, lock: true });
      if (await this.materialRepository.countMaintenanceTasks(item.id, { transaction })) {
        throw new AppError(
          'Ce matériel ne peut pas être supprimé tant que des plans de maintenance lui sont associés.',
          HTTP_STATUS.CONFLICT,
        );
      }
      oldValues = item.toJSON();
      await this.materialRepository.delete(item, { transaction });
    });
    await this.auditService.record({
      userId,
      action: 'DELETE',
      entity: 'MATERIAL',
      entityUuid: item.uuid,
      oldValues,
    });
  }
  async findDeactivationTimestamps(item) {
    const events = await this.auditService.findByEntity('MATERIAL', item.uuid);
    const event = events
      .map(auditValue)
      .find(
        (value) =>
          value.newValues?.active === false &&
          value.oldValues?.active !== false &&
          value.newValues?.updatedAt,
      );
    return [event?.newValues?.updatedAt, item.updatedAt].filter(Boolean);
  }
  async getHistory(uuid) {
    await this.getEntityByUuid(uuid);
    const events = await this.auditService.findByEntity('MATERIAL', uuid);
    const manufacturerIds = relationIds(events, ['manufacturerId', 'brandId']);
    const categoryIds = relationIds(events, ['categoryId']);
    const [manufacturers, categories] = await Promise.all([
      this.manufacturerRepository.findByIds?.(manufacturerIds),
      this.categoryRepository.findByIds?.(categoryIds),
    ]);
    const manufacturerNames = nameMap(manufacturers);
    const categoryNames = nameMap(categories);

    return events.map((event) => {
      const value = event.toJSON();
      const publicValue = {
        ...value,
        oldValues: publicAuditSnapshot(value.oldValues, manufacturerNames, categoryNames),
        newValues: publicAuditSnapshot(value.newValues, manufacturerNames, categoryNames),
      };
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
      values.serialNumber &&
      isAnother(await this.materialRepository.findBySerialNumber(values.serialNumber))
    )
      throw new AppError('Material serial number is already in use', HTTP_STATUS.CONFLICT);
  }
  async findDeletedMaterial(values) {
    const matches = await Promise.all([
      this.materialRepository.findByName(values.name, { withDeleted: true }),
      values.serialNumber
        ? this.materialRepository.findBySerialNumber(values.serialNumber, { withDeleted: true })
        : null,
    ]);
    const deletedMaterials = [
      ...new Map(
        matches
          .filter((material) => material?.deletedAt)
          .map((material) => [material.uuid, material]),
      ).values(),
    ];
    if (deletedMaterials.length > 1)
      throw new AppError('The material matches multiple deleted records', HTTP_STATUS.CONFLICT);
    return deletedMaterials[0] ?? null;
  }
  ensureDatesAreCoherent(values, item) {
    const purchaseDate = parseDateOnly(values.purchaseDate ?? item?.purchaseDate);
    const commissionedAt = parseDateOnly(values.commissionedAt ?? item?.commissionedAt);
    const retiredAt = parseDateOnly(values.retiredAt ?? item?.retiredAt);
    if (purchaseDate && commissionedAt && purchaseDate.getTime() > commissionedAt.getTime())
      throw new AppError(
        'La mise en service ne peut pas précéder la date d’achat.',
        HTTP_STATUS.BAD_REQUEST,
      );
    if (commissionedAt && retiredAt && commissionedAt.getTime() > retiredAt.getTime())
      throw new AppError(
        'La sortie de service ne peut pas précéder la mise en service.',
        HTTP_STATUS.BAD_REQUEST,
      );
  }
  toPublic(item) {
    const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
    const files = value.files;
    const publicValue = { ...value };
    delete publicValue.id;
    delete publicValue.manufacturerId;
    delete publicValue.categoryId;
    delete publicValue.createdBy;
    delete publicValue.updatedBy;
    delete publicValue.files;
    return {
      ...publicValue,
      manufacturer: value.manufacturer
        ? {
            uuid: value.manufacturer.uuid,
            name: value.manufacturer.name,
            hasLogo: Boolean(value.manufacturer.logoFileName),
          }
        : null,
      category: value.category ? { uuid: value.category.uuid, name: value.category.name } : null,
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
    if ('manufacturerUuid' in resolved || 'brandUuid' in resolved) {
      const manufacturerUuid = resolved.manufacturerUuid ?? resolved.brandUuid;
      const manufacturer = manufacturerUuid
        ? await this.manufacturerRepository.findByUuid(manufacturerUuid)
        : null;
      if (manufacturerUuid && !manufacturer)
        throw new AppError('Fabricant introuvable.', HTTP_STATUS.BAD_REQUEST);
      resolved.manufacturerId = manufacturer?.id ?? null;
      delete resolved.manufacturerUuid;
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
    return resolved;
  }
}
