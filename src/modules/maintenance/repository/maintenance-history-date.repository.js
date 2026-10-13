import sequelize from '../../../config/database.js';
import {
  companyWhere,
  requireCompanyInstance,
  requireCompanyScope,
} from '../../../core/company/company-context.js';
import CompanyScopedRepository from '../../../core/database/repositories/company-scoped.repository.js';
import StockMovement from '../../../core/inventory/stock-movement.model.js';
import { STOCKABLE_TYPES } from '../../../core/inventory/stock-operation.js';
import AuditLog from '../../audit/model/audit-log.model.js';
import MaintenancePart from '../model/maintenance-part.model.js';
import MaintenancePartPriceHistory from '../model/maintenance-part-price-history.model.js';
import MaintenanceIntervention from '../model/maintenance-intervention.model.js';

/** Company-scoped persistence for corrections of existing stock and price dates. */
export default class MaintenanceHistoryDateRepository extends CompanyScopedRepository {
  findPart(uuid, transaction) {
    return MaintenancePart.findOne({ where: companyWhere({ uuid }), transaction });
  }

  findEntry(kind, partId, uuid, transaction, lock = false) {
    const model = kind === 'price' ? MaintenancePartPriceHistory : StockMovement;
    const where =
      kind === 'price'
        ? { maintenancePartId: partId, uuid }
        : { stockableType: STOCKABLE_TYPES.MAINTENANCE_PART, stockableId: partId, uuid };
    return model.findOne({
      where: companyWhere(where),
      transaction,
      lock: lock ? transaction.LOCK.UPDATE : undefined,
    });
  }

  findIntervention(uuid, transaction) {
    return MaintenanceIntervention.findOne({
      where: companyWhere({ uuid }),
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  correctEntry(entry, performedAt, transaction) {
    requireCompanyInstance(entry);
    return entry.update({ performedAt }, { transaction });
  }

  async correctIntervention(intervention, performedAt, transaction) {
    requireCompanyInstance(intervention);
    await intervention.update({ performedAt }, { transaction });
    const { companyId } = requireCompanyScope();
    // A date-only SQL update preserves the existing parent relation and cost fields.
    await sequelize.query(
      `UPDATE maintenance_part_usages SET performed_at = :performedAt
       WHERE maintenance_intervention_id = :interventionId AND company_id = :companyId`,
      { replacements: { performedAt, interventionId: intervention.id, companyId }, transaction },
    );
    await StockMovement.update(
      { performedAt },
      {
        where: companyWhere({
          sourceType: 'maintenanceIntervention',
          sourceUuid: intervention.uuid,
        }),
        transaction,
      },
    );
    // Preserve the rest of each creation snapshot and the original recording timestamps.
    await AuditLog.update(
      {
        newValues: sequelize.fn(
          'JSON_SET',
          sequelize.col('new_values'),
          '$.performedAt',
          performedAt,
        ),
      },
      {
        where: companyWhere({
          entity: 'MAINTENANCE_INTERVENTION',
          entityUuid: intervention.uuid,
          action: 'CREATE',
        }),
        transaction,
      },
    );
    await sequelize.query(
      `UPDATE api_idempotency_keys AS replay
      INNER JOIN maintenance_interventions AS intervention
        ON intervention.uuid = JSON_UNQUOTE(JSON_EXTRACT(replay.response_body, '$.data.uuid'))
      SET replay.response_body = JSON_SET(replay.response_body, '$.data.performedAt', :performedAt)
      WHERE replay.operation = 'maintenance.intervention.create'
        AND intervention.uuid = :uuid AND intervention.company_id = :companyId
        AND replay.company_id = :companyId`,
      {
        replacements: { performedAt, uuid: intervention.uuid, companyId },
        transaction,
      },
    );
  }
}
