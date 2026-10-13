'use strict';

const interventionUuid = '285d8e1f-c911-4120-b771-f047e7963775';
const companyId = 1;

/** Correct the business date of the explicitly identified seat-stop intervention. */
async function correctDate(queryInterface, from, to) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const replacements = { interventionUuid, companyId, from, to };
    const [rows] = await queryInterface.sequelize.query(
      `SELECT id, performed_at FROM maintenance_interventions
       WHERE uuid = :interventionUuid AND company_id = :companyId FOR UPDATE`,
      { replacements, transaction },
    );
    // Other installations do not contain this intervention.
    if (!rows.length) return;
    if (rows[0].performed_at !== from && rows[0].performed_at !== to) {
      throw new Error('Unexpected seat-stop intervention date; correction aborted.');
    }
    replacements.interventionId = rows[0].id;
    for (const sql of [
      `UPDATE maintenance_interventions SET performed_at = :to
       WHERE id = :interventionId AND company_id = :companyId AND performed_at = :from`,
      `UPDATE maintenance_part_usages SET performed_at = :to
       WHERE maintenance_intervention_id = :interventionId
       AND company_id = :companyId AND performed_at = :from`,
      `UPDATE inventory_stock_movements SET performed_at = :to
       WHERE source_type = 'maintenanceIntervention' AND source_uuid = :interventionUuid
       AND company_id = :companyId AND performed_at = :from`,
      `UPDATE audit_logs SET new_values = JSON_SET(new_values, '$.performedAt', :to)
       WHERE entity = 'MAINTENANCE_INTERVENTION' AND entity_uuid = :interventionUuid
       AND company_id = :companyId
       AND JSON_UNQUOTE(JSON_EXTRACT(new_values, '$.performedAt')) = :from`,
      `UPDATE api_idempotency_keys
       SET response_body = JSON_SET(response_body, '$.data.performedAt', :to)
       WHERE operation = 'maintenance.intervention.create'
       AND JSON_UNQUOTE(JSON_EXTRACT(response_body, '$.data.uuid')) = :interventionUuid
       AND JSON_UNQUOTE(JSON_EXTRACT(response_body, '$.data.performedAt')) = :from`,
    ]) {
      await queryInterface.sequelize.query(sql, { replacements, transaction });
    }
  });
}

module.exports = {
  async up(queryInterface) {
    await correctDate(queryInterface, '2026-10-13', '2026-09-19');
  },
  async down(queryInterface) {
    await correctDate(queryInterface, '2026-09-19', '2026-10-13');
  },
};
