import AuditLog from '../model/audit-log.model.js';
import User from '../../users/model/user.model.js';

/** Database access for immutable audit records. */
export default class AuditRepository {
  async create(values) {
    return AuditLog.create(values);
  }

  async findByEntity(entity, entityUuid) {
    return AuditLog.findAll({
      where: { entity, entityUuid },
      include: [
        { model: User, as: 'user', attributes: ['uuid', 'firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }
}
