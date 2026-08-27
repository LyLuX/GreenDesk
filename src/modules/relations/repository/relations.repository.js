import { Op } from 'sequelize';

import { companyWhere, requireCompanyScope } from '../../../core/company/company-context.js';
import StockMovement from '../../../core/inventory/stock-movement.model.js';
import { STOCKABLE_TYPES } from '../../../core/inventory/stock-operation.js';
import AuditLog from '../../audit/model/audit-log.model.js';
import Category from '../../categories/model/category.model.js';
import Company from '../../companies/model/company.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import MaintenanceHistory from '../../maintenance/model/maintenance-history.model.js';
import MaintenanceIntervention from '../../maintenance/model/maintenance-intervention.model.js';
import MaintenanceOperation from '../../maintenance/model/maintenance-operation.model.js';
import MaintenancePart from '../../maintenance/model/maintenance-part.model.js';
import MaintenancePartPriceHistory from '../../maintenance/model/maintenance-part-price-history.model.js';
import MaintenancePartUsage from '../../maintenance/model/maintenance-part-usage.model.js';
import MaintenanceTask from '../../maintenance/model/maintenance-task.model.js';
import MaintenanceTaskPart from '../../maintenance/model/maintenance-task-part.model.js';
import MaterialFile from '../../materials/model/material-file.model.js';
import Material from '../../materials/model/material.model.js';
import Permission from '../../permissions/model/permission.model.js';
import Role from '../../roles/model/role.model.js';
import Supplier from '../../suppliers/model/supplier.model.js';
import UserRepository from '../../users/repository/user.repository.js';

const fleetAuditEntities = ['MATERIAL', 'CATEGORY', 'MANUFACTURER', 'SUPPLIER'];
const maintenanceAuditEntities = ['MAINTENANCE_TASK', 'MAINTENANCE_OPERATION', 'MAINTENANCE_PART'];
const administrationAuditEntities = ['USER', 'ROLE', 'PERMISSION'];

const scopedCount = (model, where = {}) => model.count({ where: companyWhere(where) });

/** Aggregate counts used by the read-only relationship graph. */
export default class RelationsRepository {
  constructor(userRepository = new UserRepository()) {
    this.userRepository = userRepository;
  }

  async getCompany() {
    const { companyId } = requireCompanyScope();
    return Company.findByPk(companyId, { attributes: ['uuid', 'name'] });
  }

  async getCounts(keys, { visibleRoleNames = undefined } = {}) {
    const { companyId, accessAll } = requireCompanyScope();
    const counters = {
      users: async () =>
        (
          await this.userRepository.findAll({
            companyId,
            visibleRoleNames,
            page: 1,
            limit: 1,
          })
        ).count,
      roles: () => Role.count(),
      permissions: () => Permission.count(),
      categories: () => scopedCount(Category),
      manufacturers: () => scopedCount(PartManufacturer),
      suppliers: () => scopedCount(Supplier),
      materials: () => scopedCount(Material),
      plans: () => scopedCount(MaintenanceTask),
      operations: () => scopedCount(MaintenanceOperation),
      parts: () => scopedCount(MaintenancePart),
      materialFiles: () => scopedCount(MaterialFile),
      taskParts: () => scopedCount(MaintenanceTaskPart),
      planExecutions: () => scopedCount(MaintenanceHistory),
      interventions: () => scopedCount(MaintenanceIntervention),
      partUsages: () => scopedCount(MaintenancePartUsage),
      priceHistory: () => scopedCount(MaintenancePartPriceHistory),
      stockMovements: () =>
        scopedCount(StockMovement, { stockableType: STOCKABLE_TYPES.MAINTENANCE_PART }),
      fleetAudit: () => scopedCount(AuditLog, { entity: { [Op.in]: fleetAuditEntities } }),
      maintenanceAudit: () =>
        scopedCount(AuditLog, { entity: { [Op.in]: maintenanceAuditEntities } }),
      administrationAudit: () =>
        AuditLog.count({
          where: accessAll
            ? {
                entity: { [Op.in]: administrationAuditEntities },
                [Op.or]: [{ companyId }, { companyId: null }],
              }
            : companyWhere({ entity: { [Op.in]: administrationAuditEntities } }),
        }),
    };
    const entries = await Promise.all(
      keys.map(async (key) => [key, Number(await counters[key]())]),
    );
    return Object.fromEntries(entries);
  }
}
