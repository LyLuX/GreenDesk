import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import { normalizePagination, paginatedResult } from '../../../core/utils/pagination.js';
import AuditService from '../../audit/service/audit.service.js';
import companyPermissions from '../company.permissions.js';
import CompanyRepository from '../repository/company.repository.js';

/** Global company lifecycle, kept independent from application roles. */
export default class CompanyService {
  constructor(repository = new CompanyRepository(), auditService = new AuditService()) {
    this.repository = repository;
    this.auditService = auditService;
  }

  async getAll(query = {}, claims = {}) {
    const accessAll = claims.permissions?.includes(companyPermissions.accessAll);
    const accessibleUuids = accessAll
      ? undefined
      : (claims.companyAccess ?? []).map(({ uuid }) => uuid);
    const result = await this.repository.findAll({ ...query, accessibleUuids });
    return paginatedResult(result, normalizePagination(query), (company) => this.toPublic(company));
  }

  async getByUuid(uuid, claims = null, options = {}) {
    return this.toPublic(await this.getEntityByUuid(uuid, claims, options));
  }

  async getEntityByUuid(uuid, claims = null, options = {}) {
    this.assertAccessible(uuid, claims);
    const company = await this.repository.findByUuid(uuid, options);
    if (!company) throw new AppError('Société introuvable.', HTTP_STATUS.NOT_FOUND);
    return company;
  }

  async create(values, userId, claims = {}) {
    const company = await this.repository.withTransaction(async (transaction) => {
      const existing = await this.repository.findByName(values.name, {
        withDeleted: true,
        transaction,
      });
      if (existing && !existing.deletedAt) {
        throw new AppError('Ce nom de société est déjà utilisé.', HTTP_STATUS.CONFLICT);
      }
      let savedCompany;
      if (existing) {
        if (!claims.permissions?.includes(companyPermissions.deleted.update)) {
          throw new AppError('Insufficient permissions', HTTP_STATUS.FORBIDDEN);
        }
        await this.repository.restore(existing, { transaction });
        savedCompany = await this.repository.update(
          existing,
          { ...values, active: true },
          { transaction },
        );
      } else {
        savedCompany = await this.repository.create(values, { transaction });
      }
      if (!claims.permissions?.includes(companyPermissions.accessAll)) {
        await this.repository.assignUser(savedCompany.id, userId, { transaction });
      }
      await this.auditService.record(
        {
          userId,
          action: existing ? 'RESTORE' : 'CREATE',
          entity: 'COMPANY',
          entityUuid: savedCompany.uuid,
          newValues: savedCompany.toJSON(),
        },
        { transaction },
      );
      return savedCompany;
    });
    return this.toPublic(company);
  }

  async update(uuid, values, userId, claims = null) {
    this.assertAccessible(uuid, claims);
    const company = await this.repository.withTransaction(async (transaction) => {
      const companyToUpdate = await this.getEntityByUuid(uuid, claims, { transaction });
      const oldValues = companyToUpdate.toJSON();
      if (values.name) {
        const duplicate = await this.repository.findByName(values.name, { transaction });
        if (duplicate && duplicate.uuid !== uuid) {
          throw new AppError('Ce nom de société est déjà utilisé.', HTTP_STATUS.CONFLICT);
        }
      }
      await this.repository.update(companyToUpdate, values, { transaction });
      if (Object.hasOwn(values, 'active') && Boolean(values.active) !== Boolean(oldValues.active)) {
        await this.repository.invalidateUserSessions(companyToUpdate.id, {
          transaction,
        });
      }
      await this.auditService.record(
        {
          userId,
          action: 'UPDATE',
          entity: 'COMPANY',
          entityUuid: companyToUpdate.uuid,
          oldValues,
          newValues: companyToUpdate.toJSON(),
        },
        { transaction },
      );
      return companyToUpdate;
    });
    return this.toPublic(company);
  }

  async remove(uuid, userId, claims = null) {
    this.assertAccessible(uuid, claims);
    return this.repository.withTransaction(async (transaction) => {
      const company = await this.repository.findByUuid(uuid, { transaction });
      if (!company) throw new AppError('Société introuvable.', HTTP_STATUS.NOT_FOUND);
      if (await this.repository.hasDependencies(company.id, { transaction })) {
        throw new AppError(
          'Cette société ne peut pas être supprimée tant que des utilisateurs ou des données y sont rattachés.',
          HTTP_STATUS.CONFLICT,
        );
      }
      await this.repository.delete(company, { transaction });
      await this.auditService.record(
        {
          userId,
          action: 'DELETE',
          entity: 'COMPANY',
          entityUuid: company.uuid,
          oldValues: company.toJSON(),
        },
        { transaction },
      );
    });
  }

  async restore(uuid, userId, claims = null) {
    this.assertAccessible(uuid, claims);
    const company = await this.repository.withTransaction(async (transaction) => {
      const company = await this.repository.findByUuid(uuid, {
        withDeleted: true,
        transaction,
      });
      if (!company) throw new AppError('Société introuvable.', HTTP_STATUS.NOT_FOUND);
      if (!company.deletedAt) {
        throw new AppError('Cette société n’est pas supprimée.', HTTP_STATUS.CONFLICT);
      }
      const oldValues = company.toJSON();
      await this.repository.restore(company, { transaction });
      await this.auditService.record(
        {
          userId,
          action: 'RESTORE',
          entity: 'COMPANY',
          entityUuid: company.uuid,
          oldValues,
          newValues: company.toJSON(),
        },
        { transaction },
      );
      return company;
    });
    return this.toPublic(company);
  }

  assertAccessible(uuid, claims) {
    if (!claims) return;
    if (claims.permissions?.includes(companyPermissions.accessAll)) return;
    if ((claims.companyAccess ?? []).some((company) => company.uuid === uuid)) return;
    throw new AppError('Société introuvable.', HTTP_STATUS.NOT_FOUND);
  }

  toPublic(company) {
    const value = typeof company.toJSON === 'function' ? company.toJSON() : company;
    const publicValue = { ...value, hasLogo: Boolean(value.logoFileName) };
    delete publicValue.logoFileName;
    delete publicValue.logoOriginalName;
    delete publicValue.logoMimeType;
    return publicValue;
  }
}
