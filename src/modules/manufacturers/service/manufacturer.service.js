import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import ManufacturerRepository from '../repository/manufacturer.repository.js';

/** Global manufacturer lifecycle shared by materials and maintenance parts. */
export default class ManufacturerService {
  constructor(repository = new ManufacturerRepository(), auditService = new AuditService()) {
    this.repository = repository;
    this.auditService = auditService;
  }

  async getAll(search) {
    return (await this.repository.findAll(search)).map((item) => this.toPublic(item));
  }

  async getByUuid(uuid) {
    return this.toPublic(await this.getEntityByUuid(uuid));
  }

  async getEntityByUuid(uuid, { allowInactive = true, ...options } = {}) {
    const item = await this.repository.findByUuid(uuid, options);
    if (!item || (!allowInactive && !item.active)) {
      throw new AppError('Fabricant introuvable ou inactif.', HTTP_STATUS.NOT_FOUND);
    }
    return item;
  }

  async create(values, userId) {
    const existing = await this.repository.findByName(values.name, { withDeleted: true });
    if (existing && !existing.deletedAt) {
      throw new AppError('Ce fabricant existe déjà.', HTTP_STATUS.CONFLICT);
    }
    const item = await this.repository.withTransaction(async (transaction) => {
      let created;
      if (existing) {
        await this.repository.restore(existing, { transaction });
        created = await this.repository.update(
          existing,
          { ...values, active: true, updatedBy: userId },
          { transaction },
        );
      } else {
        created = await this.repository.create(
          { ...values, createdBy: userId, updatedBy: userId },
          { transaction },
        );
      }
      await this.auditService.record(
        {
          userId,
          action: existing ? 'RESTORE' : 'CREATE',
          entity: 'MANUFACTURER',
          entityUuid: created.uuid,
          newValues: created.toJSON(),
        },
        { transaction },
      );
      return created;
    });
    return this.toPublic(item);
  }

  async update(uuid, values, userId) {
    const item = await this.getEntityByUuid(uuid);
    if (values.name) {
      const duplicate = await this.repository.findByName(values.name);
      if (duplicate && duplicate.uuid !== item.uuid) {
        throw new AppError('Ce fabricant existe déjà.', HTTP_STATUS.CONFLICT);
      }
    }
    const oldValues = item.toJSON();
    await this.repository.withTransaction(async (transaction) => {
      await this.repository.update(item, { ...values, updatedBy: userId }, { transaction });
      if (values.name) {
        await this.repository.updatePartNames(item.id, item.name, { transaction });
      }
      await this.auditService.record(
        {
          userId,
          action: 'UPDATE',
          entity: 'MANUFACTURER',
          entityUuid: item.uuid,
          oldValues,
          newValues: item.toJSON(),
        },
        { transaction },
      );
    });
    return this.toPublic(item);
  }

  async remove(uuid, userId) {
    await this.repository.withTransaction(async (transaction) => {
      const item = await this.getEntityByUuid(uuid, { transaction });
      const [materials, parts] = await Promise.all([
        this.repository.countMaterials(item.id, { transaction }),
        this.repository.countParts(item.id, { transaction }),
      ]);
      if (materials || parts) {
        throw new AppError(
          'Ce fabricant est encore utilisé par un matériel ou une pièce.',
          HTTP_STATUS.CONFLICT,
        );
      }
      const oldValues = item.toJSON();
      await this.repository.delete(item, { transaction });
      await this.auditService.record(
        { userId, action: 'DELETE', entity: 'MANUFACTURER', entityUuid: item.uuid, oldValues },
        { transaction },
      );
    });
  }

  toPublic(item) {
    const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
    const publicValue = { ...value, hasLogo: Boolean(value.logoFileName) };
    delete publicValue.id;
    delete publicValue.logoFileName;
    delete publicValue.logoOriginalName;
    delete publicValue.logoMimeType;
    delete publicValue.createdBy;
    delete publicValue.updatedBy;
    return publicValue;
  }
}
