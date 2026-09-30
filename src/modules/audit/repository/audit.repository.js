import AppError from '../../../core/errors/app-error.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AuditLog from '../model/audit-log.model.js';
import User from '../../users/model/user.model.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import { companyWhere, companyValues } from '../../../core/company/company-context.js';

/** Database access for immutable audit records. */
export default class AuditRepository {
  async create(values, options = {}) {
    return AuditLog.create(companyValues(values), options);
  }

  async createGlobal(values, options = {}) {
    return AuditLog.create({ ...values, companyId: null }, options);
  }

  async createAttributed(values, options = {}) {
    const companyId = values.companyId ?? null;
    if (companyId !== null && (!Number.isSafeInteger(companyId) || companyId <= 0)) {
      throw new AppError('Un contexte de société est requis.', HTTP_STATUS.FORBIDDEN);
    }
    return AuditLog.create({ ...values, companyId }, options);
  }

  async findByEntity(entity, entityUuid, query = {}) {
    const pagination = normalizePagination(query);
    return AuditLog.findAndCountAll({
      where: companyWhere({ entity, entityUuid }),
      include: [
        { model: User, as: 'user', attributes: ['uuid', 'firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
    });
  }

  async findAllByEntity(entity, entityUuid) {
    return AuditLog.findAll({
      where: companyWhere({ entity, entityUuid }),
      order: [['createdAt', 'DESC']],
    });
  }
}
