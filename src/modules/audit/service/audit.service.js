import AuditRepository from '../repository/audit.repository.js';
import { companyValues } from '../../../core/company/company-context.js';

/** Records domain events in a format reusable by future GreenDesk modules. */
export default class AuditService {
  constructor(auditRepository = new AuditRepository()) {
    this.auditRepository = auditRepository;
  }

  /** Records a business event in the active company; supplied company IDs cannot override it. */
  async record(event, options = {}) {
    return this.auditRepository.create(companyValues(this.eventValues(event)), options);
  }

  /** Identity flows explicitly attribute events to a server-resolved company or to no company. */
  async recordAttributed(event, options = {}) {
    return this.auditRepository.createAttributed(this.eventValues(event), options);
  }

  /** Global administration events must not acquire an incidental request company. */
  async recordGlobal(event, options = {}) {
    return this.auditRepository.createGlobal(this.eventValues(event), options);
  }

  eventValues(event) {
    return {
      companyId: event.companyId ?? null,
      userId: event.userId ?? null,
      action: event.action,
      entity: event.entity,
      entityUuid: event.entityUuid ?? null,
      oldValues: event.oldValues ?? null,
      newValues: event.newValues ?? null,
    };
  }

  async findByEntity(entity, entityUuid, query) {
    return this.auditRepository.findByEntity(entity, entityUuid, query);
  }

  async findAllByEntity(entity, entityUuid) {
    return this.auditRepository.findAllByEntity(entity, entityUuid);
  }
}
