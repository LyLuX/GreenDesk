import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import MaintenanceHistoryDateRepository from '../repository/maintenance-history-date.repository.js';
import maintenancePermissions from '../maintenance.permissions.js';
import { parseDateOnly, todayDateOnly } from './maintenance-deadline.service.js';

export const supportsMovementDateCorrection = (movement) => {
  if (movement.sourceType && movement.sourceType !== 'maintenanceIntervention') return false;
  if (movement.operation === 'consume') return movement.sourceType === 'maintenanceIntervention';
  return ['order', 'receive', 'adjust'].includes(movement.operation);
};

/** Corrects a recorded business date without replaying quantities or changing costs. */
export default class MaintenanceHistoryDateService {
  constructor(
    repository = new MaintenanceHistoryDateRepository(),
    auditService = new AuditService(),
  ) {
    this.repository = repository;
    this.auditService = auditService;
  }

  async correct(partUuid, entryUuid, values, user) {
    const { kind, performedAt, previousPerformedAt } = values;
    if (
      !['stock', 'price'].includes(kind) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(performedAt) ||
      !Number.isFinite(parseDateOnly(performedAt)?.getTime()) ||
      parseDateOnly(performedAt) > parseDateOnly(todayDateOnly())
    ) {
      throw new AppError(
        'La date de l’opération est invalide ou dans le futur.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    return this.repository.withTransaction(async (transaction) => {
      const part = await this.repository.findPart(partUuid, transaction);
      if (!part) throw new AppError('Pièce introuvable.', HTTP_STATUS.NOT_FOUND);
      let entry = await this.repository.findEntry(kind, part.id, entryUuid, transaction);
      if (!entry)
        throw new AppError('Événement introuvable pour cette pièce.', HTTP_STATUS.NOT_FOUND);
      if (kind === 'stock' && !supportsMovementDateCorrection(entry)) {
        throw new AppError(
          'La date de cet événement ne peut pas être corrigée depuis la pièce.',
          HTTP_STATUS.CONFLICT,
        );
      }
      if (!user.permissions?.includes(maintenancePermissions.parts.history.date.update)) {
        throw new AppError(
          'Vous n’avez pas la permission de corriger cette opération.',
          HTTP_STATUS.FORBIDDEN,
        );
      }
      let intervention;
      if (kind === 'stock' && entry.sourceType === 'maintenanceIntervention') {
        intervention = await this.repository.findIntervention(entry.sourceUuid, transaction);
        if (!intervention)
          throw new AppError('Intervention liée introuvable.', HTTP_STATUS.CONFLICT);
      }
      entry = await this.repository.findEntry(kind, part.id, entryUuid, transaction, true);
      if (!entry)
        throw new AppError('Événement introuvable pour cette pièce.', HTTP_STATUS.NOT_FOUND);
      if (
        entry.performedAt !== previousPerformedAt ||
        (intervention && intervention.performedAt !== previousPerformedAt)
      ) {
        throw new AppError(
          'La date a déjà été modifiée. Rechargez l’historique avant de réessayer.',
          HTTP_STATUS.CONFLICT,
        );
      }
      if (performedAt === previousPerformedAt) return { uuid: entryUuid, kind, performedAt };
      if (intervention) {
        await this.repository.correctIntervention(intervention, performedAt, transaction);
      } else {
        await this.repository.correctEntry(entry, performedAt, transaction);
      }
      await this.auditService.record(
        {
          userId: user.userId,
          action: 'DATE_CORRECTION',
          entity: 'MAINTENANCE_PART',
          entityUuid: partUuid,
          oldValues: { performedAt: previousPerformedAt, entryUuid, kind },
          newValues: { performedAt, entryUuid, kind },
        },
        { transaction },
      );
      return { uuid: entryUuid, kind, performedAt };
    });
  }
}
