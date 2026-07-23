import AuditLog from '../model/audit-log.model.js';

/** Database access for immutable audit records. */
export default class AuditRepository {
  async create(values) {
    return AuditLog.create(values);
  }
}
