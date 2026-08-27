import { Op } from 'sequelize';

import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import Company from '../model/company.model.js';

/** Persistence operations for global companies and user affiliations. */
export default class CompanyRepository extends TransactionalRepository {
  findAll({ search, active, deleted = false, page, limit, accessibleUuids } = {}) {
    const pagination = normalizePagination({ page, limit });
    const where = {};
    if (search) {
      const pattern = `%${search}%`;
      where.name = { [Op.like]: pattern };
    }
    const normalizedActive = normalizeBooleanFilter(active);
    if (normalizedActive !== undefined) where.active = normalizedActive;
    if (deleted) where.deletedAt = { [Op.ne]: null };
    if (Array.isArray(accessibleUuids)) where.uuid = { [Op.in]: accessibleUuids };
    return Company.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset,
      paranoid: !deleted,
    });
  }

  findByUuid(uuid, { transaction, withDeleted = false } = {}) {
    return Company.findOne({ where: { uuid }, paranoid: !withDeleted, transaction });
  }

  findByName(name, { transaction, withDeleted = false } = {}) {
    return Company.findOne({ where: { name }, paranoid: !withDeleted, transaction });
  }

  findByUuids(uuids, { transaction } = {}) {
    return Company.findAll({ where: { uuid: { [Op.in]: uuids }, active: true }, transaction });
  }

  findFirstActive({ transaction } = {}) {
    return Company.findOne({ where: { active: true }, order: [['id', 'ASC']], transaction });
  }

  findAllActive({ transaction } = {}) {
    return Company.findAll({ where: { active: true }, order: [['name', 'ASC']], transaction });
  }

  create(values, { transaction } = {}) {
    return Company.create(values, { transaction });
  }

  update(company, values, { transaction } = {}) {
    return company.update(values, { transaction });
  }

  restore(company, { transaction } = {}) {
    return company.restore({ transaction });
  }

  delete(company, { transaction } = {}) {
    return company.destroy({ transaction });
  }

  async hasDependencies(companyId, { transaction } = {}) {
    const [rows] = await Company.sequelize.query(
      `SELECT
         (SELECT COUNT(*) FROM user_companies WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM materials WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM categories WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM part_manufacturers WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM suppliers WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM maintenance_operations WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM maintenance_parts WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM maintenance_tasks WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM maintenance_task_parts WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM maintenance_history WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM maintenance_interventions WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM maintenance_part_usages WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM maintenance_part_price_history WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM inventory_stock_movements WHERE company_id = :companyId) +
         (SELECT COUNT(*) FROM audit_logs WHERE company_id = :companyId)
       AS dependencyCount`,
      { replacements: { companyId }, transaction },
    );
    return Number(rows[0]?.dependencyCount ?? 0) > 0;
  }

  assignUser(companyId, userId, { transaction } = {}) {
    return Company.sequelize.query(
      `INSERT IGNORE INTO user_companies (user_id, company_id, created_at, updated_at)
       VALUES (:userId, :companyId, NOW(), NOW())`,
      { replacements: { companyId, userId }, transaction },
    );
  }

  invalidateUserSessions(companyId, { excludeUserId, transaction } = {}) {
    return Company.sequelize.query(
      `UPDATE users AS u
       INNER JOIN user_companies AS membership ON membership.user_id = u.id
       SET u.authorization_version = u.authorization_version + 1
       WHERE membership.company_id = :companyId
         ${excludeUserId ? 'AND u.id <> :excludeUserId' : ''}`,
      { replacements: { companyId, excludeUserId }, transaction },
    );
  }
}
