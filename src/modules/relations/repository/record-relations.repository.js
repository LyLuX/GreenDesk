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

const toPlain = (record) =>
  typeof record?.toJSON === 'function' ? record.toJSON() : { ...record };
const GRAPH_AUDIT_LIMIT = 100;
const scopedRecords = (model, attributes, options = {}) =>
  model.findAll({
    attributes,
    where: companyWhere(options.where),
    order: options.order ?? [['id', 'ASC']],
  });

/** Loads the actual records and foreign-key associations shown in the relationship graph. */
export default class RecordRelationsRepository {
  constructor(userRepository = new UserRepository()) {
    this.userRepository = userRepository;
  }

  async getCompany() {
    const { companyId } = requireCompanyScope();
    return Company.findByPk(companyId, { attributes: ['uuid', 'name'] });
  }

  async getRecords(keys, { visibleRoleNames = undefined, auditEntities = [] } = {}) {
    const { companyId, accessAll } = requireCompanyScope();
    const loaders = {
      users: async () => {
        const firstPage = await this.userRepository.findAll({
          companyId,
          visibleRoleNames,
          page: 1,
          limit: 100,
        });
        const rows = [...firstPage.rows];
        for (let page = 2; rows.length < firstPage.count; page += 1) {
          const nextPage = await this.userRepository.findAll({
            companyId,
            visibleRoleNames,
            page,
            limit: 100,
          });
          if (!nextPage.rows.length) break;
          rows.push(...nextPage.rows);
        }
        return rows;
      },
      roles: () =>
        Role.findAll({
          attributes: ['id', 'uuid', 'name', 'description'],
          include: [
            {
              model: Permission,
              as: 'permissions',
              attributes: ['uuid', 'name', 'description'],
              through: { attributes: [] },
            },
          ],
          order: [['name', 'ASC']],
        }),
      permissions: () =>
        Permission.findAll({
          attributes: ['id', 'uuid', 'name', 'description'],
          order: [['name', 'ASC']],
        }),
      categories: () => scopedRecords(Category, ['id', 'uuid', 'name']),
      manufacturers: () => scopedRecords(PartManufacturer, ['id', 'uuid', 'name']),
      suppliers: () => scopedRecords(Supplier, ['id', 'uuid', 'name']),
      materials: () =>
        scopedRecords(Material, [
          'id',
          'uuid',
          'name',
          'model',
          'serialNumber',
          'categoryId',
          'manufacturerId',
        ]),
      plans: () =>
        scopedRecords(MaintenanceTask, [
          'id',
          'uuid',
          'title',
          'maintenanceType',
          'materialId',
          'operationId',
        ]),
      operations: () =>
        scopedRecords(MaintenanceOperation, ['id', 'uuid', 'name', 'maintenanceType']),
      parts: () =>
        scopedRecords(MaintenancePart, [
          'id',
          'uuid',
          'name',
          'reference',
          'unit',
          'manufacturerId',
          'supplierId',
        ]),
      taskParts: () =>
        scopedRecords(MaintenanceTaskPart, ['maintenanceTaskId', 'maintenancePartId', 'quantity'], {
          order: [
            ['maintenanceTaskId', 'ASC'],
            ['maintenancePartId', 'ASC'],
          ],
        }),
      materialFiles: () =>
        scopedRecords(MaterialFile, ['id', 'uuid', 'materialId', 'originalName', 'kind']),
      planExecutions: () =>
        scopedRecords(MaintenanceHistory, [
          'id',
          'uuid',
          'maintenanceTaskId',
          'performedAt',
          'executionType',
          'performedBy',
        ]),
      interventions: () =>
        scopedRecords(MaintenanceIntervention, [
          'id',
          'uuid',
          'materialId',
          'description',
          'performedAt',
          'performedBy',
        ]),
      partUsages: () =>
        scopedRecords(MaintenancePartUsage, [
          'id',
          'uuid',
          'maintenanceHistoryId',
          'maintenanceInterventionId',
          'maintenancePartId',
          'partName',
          'partReference',
          'unit',
          'quantity',
          'performedAt',
        ]),
      priceHistory: () =>
        scopedRecords(MaintenancePartPriceHistory, [
          'id',
          'uuid',
          'maintenancePartId',
          'previousUnitPrice',
          'unitPrice',
          'changedBy',
          'performedAt',
        ]),
      stockMovements: () =>
        scopedRecords(
          StockMovement,
          [
            'id',
            'uuid',
            'stockableId',
            'operation',
            'quantityOnHandChange',
            'quantityOnOrderChange',
            'performedBy',
            'performedAt',
          ],
          { where: { stockableType: STOCKABLE_TYPES.MAINTENANCE_PART } },
        ),
      auditLogs: () =>
        AuditLog.findAll({
          attributes: ['id', 'uuid', 'userId', 'action', 'entity', 'entityUuid', 'createdAt'],
          where: accessAll
            ? {
                entity: { [Op.in]: auditEntities },
                [Op.or]: [{ companyId }, { companyId: null }],
              }
            : companyWhere({ entity: { [Op.in]: auditEntities } }),
          order: [['id', 'DESC']],
          limit: GRAPH_AUDIT_LIMIT,
        }),
    };

    const entries = await Promise.all(
      keys.map(async (key) => [key, (await loaders[key]()).map(toPlain)]),
    );
    return Object.fromEntries(entries);
  }
}
