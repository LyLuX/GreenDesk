import AuditRepository from '../repository/audit.repository.js';

/** Records domain events in a format reusable by future GreenDesk modules. */
export default class AuditService {
  constructor(auditRepository = new AuditRepository()) {
    this.auditRepository = auditRepository;
  }

  /** @param {{userId?: number, action: string, entity: string, entityUuid?: string, oldValues?: object, newValues?: object}} event - Audit event. */
  async record(event) {
    return this.auditRepository.create({
      userId: event.userId ?? null,
      action: event.action,
      entity: event.entity,
      entityUuid: event.entityUuid ?? null,
      oldValues: event.oldValues ?? null,
      newValues: event.newValues ?? null,
    });
  }

  async findByEntity(entity, entityUuid) {
    return this.auditRepository.findByEntity(entity, entityUuid);
  }
}
