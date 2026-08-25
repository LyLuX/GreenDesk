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
    return paginatedResult(result, normalizePagination(query));
  }

  async getByUuid(uuid, claims = null, options = {}) {
    this.assertAccessible(uuid, claims);
    const company = await this.repository.findByUuid(uuid, options);
    if (!company) throw new AppError('Société introuvable.', HTTP_STATUS.NOT_FOUND);
    return company;
  }

  async create(values, userId, claims = {}) {
    return this.repository.withTransaction(async (transaction) => {
      const existing = await this.repository.findByCode(values.code, {
        withDeleted: true,
        transaction,
      });
      if (existing && !existing.deletedAt) {
        throw new AppError('Ce code société est déjà utilisé.', HTTP_STATUS.CONFLICT);
      }
      const duplicateName = await this.repository.findByName(values.name, {
        withDeleted: true,
        transaction,
      });
      if (duplicateName && duplicateName.uuid !== existing?.uuid) {
        throw new AppError('Ce nom de société est déjà utilisé.', HTTP_STATUS.CONFLICT);
      }
      let company;
      if (existing) {
        await this.repository.restore(existing, { transaction });
        company = await this.repository.update(
          existing,
          { ...values, active: true },
          { transaction },
        );
      } else {
        company = await this.repository.create(values, { transaction });
      }
      if (!claims.permissions?.includes(companyPermissions.accessAll)) {
        await this.repository.assignUser(company.id, userId, { transaction });
      }
      await this.auditService.record(
        {
          userId,
          action: existing ? 'RESTORE' : 'CREATE',
          entity: 'COMPANY',
          entityUuid: company.uuid,
          newValues: company.toJSON(),
        },
        { transaction },
      );
      return company;
    });
  }

  async update(uuid, values, userId, claims = null) {
    this.assertAccessible(uuid, claims);
    if (Object.hasOwn(values, 'code')) {
      throw new AppError('Le code d’une société est immuable.', HTTP_STATUS.BAD_REQUEST);
    }
    return this.repository.withTransaction(async (transaction) => {
      const company = await this.getByUuid(uuid, claims, { transaction });
      const oldValues = company.toJSON();
      if (values.name) {
        const duplicate = await this.repository.findByName(values.name, { transaction });
        if (duplicate && duplicate.uuid !== uuid) {
          throw new AppError('Ce nom de société est déjà utilisé.', HTTP_STATUS.CONFLICT);
        }
      }
      await this.repository.update(company, values, { transaction });
      if (Object.hasOwn(values, 'active') && Boolean(values.active) !== Boolean(oldValues.active)) {
        await this.repository.invalidateUserSessions(company.id, {
          excludeUserId: userId,
          transaction,
        });
      }
      await this.auditService.record(
        {
          userId,
          action: 'UPDATE',
          entity: 'COMPANY',
          entityUuid: company.uuid,
          oldValues,
          newValues: company.toJSON(),
        },
        { transaction },
      );
      return company;
    });
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

  assertAccessible(uuid, claims) {
    if (!claims) return;
    if (claims.permissions?.includes(companyPermissions.accessAll)) return;
    if ((claims.companyAccess ?? []).some((company) => company.uuid === uuid)) return;
    throw new AppError('Société introuvable.', HTTP_STATUS.NOT_FOUND);
  }
}
