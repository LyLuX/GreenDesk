import AuditLog from '../model/audit-log.model.js';
import User from '../../users/model/user.model.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import { companyWhere } from '../../../core/company/company-context.js';

/** Database access for immutable audit records. */
export default class AuditRepository {
  async create(values, options = {}) {
    return AuditLog.create(values, options);
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
