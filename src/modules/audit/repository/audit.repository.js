import AuditLog from '../model/audit-log.model.js';
import User from '../../users/model/user.model.js';
import { normalizePagination } from '../../../core/utils/pagination.js';

/** Database access for immutable audit records. */
export default class AuditRepository {
  async create(values, options = {}) {
    return AuditLog.create(values, options);
  }

  async findByEntity(entity, entityUuid, query = {}) {
    const pagination = normalizePagination(query);
    return AuditLog.findAndCountAll({
      where: { entity, entityUuid },
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
      where: { entity, entityUuid },
      order: [['createdAt', 'DESC']],
    });
  }
}
