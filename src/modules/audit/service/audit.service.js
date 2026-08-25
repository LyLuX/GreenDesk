import AuditRepository from '../repository/audit.repository.js';
import { companyValues } from '../../../core/company/company-context.js';

/** Records domain events in a format reusable by future GreenDesk modules. */
export default class AuditService {
  constructor(auditRepository = new AuditRepository()) {
    this.auditRepository = auditRepository;
  }

  /** Records an audit event, using its explicit company only when no request scope exists. */
  async record(event, options = {}) {
    return this.auditRepository.create(
      companyValues({
        companyId: event.companyId ?? null,
        userId: event.userId ?? null,
        action: event.action,
        entity: event.entity,
        entityUuid: event.entityUuid ?? null,
        oldValues: event.oldValues ?? null,
        newValues: event.newValues ?? null,
      }),
      options,
    );
  }

  async findByEntity(entity, entityUuid, query) {
    return this.auditRepository.findByEntity(entity, entityUuid, query);
  }

  async findAllByEntity(entity, entityUuid) {
    return this.auditRepository.findAllByEntity(entity, entityUuid);
  }
}
