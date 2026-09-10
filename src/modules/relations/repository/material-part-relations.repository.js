import { QueryTypes } from 'sequelize';

import sequelize from '../../../config/database.js';
import { requireCompanyScope } from '../../../core/company/company-context.js';
import RecordRelationsRepository from './record-relations.repository.js';

/** Aggregates actual usage separately from current plans to avoid multiplying quantities. */
export default class MaterialPartRelationsRepository extends RecordRelationsRepository {
  async getMaterials({ includeCategories = false } = {}) {
    const { companyId } = requireCompanyScope();
    return sequelize.query(
      `SELECT m.uuid, m.name, m.model, m.serial_number AS serialNumber
              ${includeCategories ? ', c.uuid AS categoryUuid, c.name AS categoryName' : ''}
       FROM materials m
       ${includeCategories ? 'LEFT JOIN categories c ON c.id = m.category_id AND c.company_id = $companyId AND c.deleted_at IS NULL' : ''}
       WHERE m.company_id = $companyId AND m.deleted_at IS NULL
       ORDER BY ${includeCategories ? 'c.name, ' : ''}m.name, m.id`,
      { bind: { companyId }, type: QueryTypes.SELECT },
    );
  }

  async getRelationships() {
    const { companyId } = requireCompanyScope();
    return sequelize.query(
      `SELECT materialUuid, partUuid, MAX(partName) AS partName,
              MAX(partReference) AS partReference, unit, MAX(planned) AS planned,
              MAX(cataloguePart) AS cataloguePart,
              SUM(quantity) AS consumedQuantity, MAX(performedAt) AS lastUsedAt
       FROM (
         SELECT m.uuid AS materialUuid, p.uuid AS partUuid, p.name AS partName,
                p.reference AS partReference, p.unit, 1 AS planned, 1 AS cataloguePart,
                0 AS quantity, NULL AS performedAt
         FROM maintenance_task_parts tp
         JOIN maintenance_tasks t ON t.id = tp.maintenance_task_id AND t.company_id = $companyId
         JOIN materials m ON m.id = t.material_id AND m.company_id = $companyId
         JOIN maintenance_parts p ON p.id = tp.maintenance_part_id AND p.company_id = $companyId
         WHERE tp.company_id = $companyId AND t.deleted_at IS NULL AND t.active = 1
           AND m.deleted_at IS NULL AND p.deleted_at IS NULL
         UNION ALL
         SELECT m.uuid, u.part_uuid, COALESCE(p.name, u.part_name),
                COALESCE(p.reference, u.part_reference), u.unit, 0,
                CASE WHEN p.id IS NULL THEN 0 ELSE 1 END, u.quantity, u.performed_at
         FROM maintenance_part_usages u
         JOIN maintenance_history h ON h.id = u.maintenance_history_id AND h.company_id = $companyId
         JOIN maintenance_tasks t ON t.id = h.maintenance_task_id AND t.company_id = $companyId
         JOIN materials m ON m.id = t.material_id AND m.company_id = $companyId
         LEFT JOIN maintenance_parts p ON p.uuid = u.part_uuid AND p.company_id = $companyId
           AND p.deleted_at IS NULL
         WHERE u.company_id = $companyId AND m.deleted_at IS NULL
         UNION ALL
         SELECT m.uuid, u.part_uuid, COALESCE(p.name, u.part_name),
                COALESCE(p.reference, u.part_reference), u.unit, 0,
                CASE WHEN p.id IS NULL THEN 0 ELSE 1 END, u.quantity, u.performed_at
         FROM maintenance_part_usages u
         JOIN maintenance_interventions i ON i.id = u.maintenance_intervention_id
           AND i.company_id = $companyId
         JOIN materials m ON m.id = i.material_id AND m.company_id = $companyId
         LEFT JOIN maintenance_parts p ON p.uuid = u.part_uuid AND p.company_id = $companyId
           AND p.deleted_at IS NULL
         WHERE u.company_id = $companyId AND m.deleted_at IS NULL
       ) links
       GROUP BY materialUuid, partUuid, unit
       ORDER BY partName, partReference, partUuid, materialUuid, unit`,
      { bind: { companyId }, type: QueryTypes.SELECT },
    );
  }
}
