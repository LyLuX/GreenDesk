import { Op, Sequelize } from 'sequelize';

import sequelize from '../../../config/database.js';
import { STOCKABLE_TYPES } from '../../../core/inventory/stock-operation.js';
import StockMovement from '../../../core/inventory/stock-movement.model.js';
import Material from '../../materials/model/material.model.js';
import MaintenanceHistory from '../../maintenance/model/maintenance-history.model.js';
import { MAINTENANCE_EXECUTION_TYPES } from '../../maintenance/maintenance.constants.js';
import MaintenanceIntervention from '../../maintenance/model/maintenance-intervention.model.js';
import MaintenancePart from '../../maintenance/model/maintenance-part.model.js';
import MaintenancePartPriceHistory from '../../maintenance/model/maintenance-part-price-history.model.js';
import MaintenancePartUsage from '../../maintenance/model/maintenance-part-usage.model.js';
import MaintenanceTask from '../../maintenance/model/maintenance-task.model.js';
import User from '../../users/model/user.model.js';
import AuditLog from '../model/audit-log.model.js';
import { HISTORY_SECTIONS } from '../history.constants.js';

const AUDIT_TYPES = Object.freeze({
  MATERIAL: 'material',
  CATEGORY: 'category',
  MANUFACTURER: 'manufacturer',
  SUPPLIER: 'supplier',
  MAINTENANCE_TASK: 'maintenance_plan',
  MAINTENANCE_OPERATION: 'maintenance_operation',
  MAINTENANCE_PART: 'maintenance_part',
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
});

const SECTION_ENTITIES = Object.freeze({
  [HISTORY_SECTIONS.FLEET]: ['MATERIAL', 'CATEGORY', 'MANUFACTURER', 'SUPPLIER'],
  [HISTORY_SECTIONS.MAINTENANCE]: ['MAINTENANCE_TASK', 'MAINTENANCE_OPERATION', 'MAINTENANCE_PART'],
  [HISTORY_SECTIONS.ADMINISTRATION]: ['USER', 'ROLE', 'PERMISSION'],
});

const userAttributes = ['uuid', 'firstName', 'lastName', 'email'];
const auditExcludedActions = ['EXECUTE', 'EXECUTE_WITHOUT_PARTS', 'STOCK_UPDATE', 'PRICE_UPDATE'];
const auditSubjectJoinQuery = `
  SELECT
    auditLogs.uuid AS auditUuid,
    CASE auditLogs.entity
      WHEN 'MATERIAL' THEN materials.name
      WHEN 'CATEGORY' THEN categories.name
      WHEN 'MANUFACTURER' THEN manufacturers.name
      WHEN 'SUPPLIER' THEN suppliers.name
      WHEN 'MAINTENANCE_TASK' THEN maintenanceTasks.title
      WHEN 'MAINTENANCE_OPERATION' THEN maintenanceOperations.name
      WHEN 'MAINTENANCE_PART' THEN CONCAT(maintenanceParts.name, ' (', maintenanceParts.reference, ')')
      WHEN 'USER' THEN COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', auditUsers.first_name, auditUsers.last_name)), ''),
        auditUsers.email
      )
      WHEN 'ROLE' THEN roles.name
      WHEN 'PERMISSION' THEN COALESCE(NULLIF(permissions.description, ''), permissions.name)
      ELSE NULL
    END AS subjectLabel
  FROM audit_logs AS auditLogs
  LEFT JOIN materials AS materials
    ON auditLogs.entity = 'MATERIAL' AND materials.uuid = auditLogs.entity_uuid
  LEFT JOIN categories AS categories
    ON auditLogs.entity = 'CATEGORY' AND categories.uuid = auditLogs.entity_uuid
  LEFT JOIN part_manufacturers AS manufacturers
    ON auditLogs.entity = 'MANUFACTURER' AND manufacturers.uuid = auditLogs.entity_uuid
  LEFT JOIN suppliers AS suppliers
    ON auditLogs.entity = 'SUPPLIER' AND suppliers.uuid = auditLogs.entity_uuid
  LEFT JOIN maintenance_tasks AS maintenanceTasks
    ON auditLogs.entity = 'MAINTENANCE_TASK' AND maintenanceTasks.uuid = auditLogs.entity_uuid
  LEFT JOIN maintenance_operations AS maintenanceOperations
    ON auditLogs.entity = 'MAINTENANCE_OPERATION'
    AND maintenanceOperations.uuid = auditLogs.entity_uuid
  LEFT JOIN maintenance_parts AS maintenanceParts
    ON auditLogs.entity = 'MAINTENANCE_PART' AND maintenanceParts.uuid = auditLogs.entity_uuid
  LEFT JOIN users AS auditUsers
    ON auditLogs.entity = 'USER' AND auditUsers.uuid = auditLogs.entity_uuid
  LEFT JOIN roles AS roles
    ON auditLogs.entity = 'ROLE' AND roles.uuid = auditLogs.entity_uuid
  LEFT JOIN permissions AS permissions
    ON auditLogs.entity = 'PERMISSION' AND permissions.uuid = auditLogs.entity_uuid
  WHERE auditLogs.uuid IN (:auditUuids)
`;

const dateOnlyWhere = ({ from, through }) => ({
  ...(from ? { [Op.gte]: from } : {}),
  ...(through ? { [Op.lte]: through } : {}),
});

const createdAtWhere = ({ from, through }) => {
  const where = {};
  if (from) where[Op.gte] = new Date(`${from}T00:00:00.000Z`);
  if (through) {
    const exclusiveEnd = new Date(`${through}T00:00:00.000Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    where[Op.lt] = exclusiveEnd;
  }
  return where;
};

const appliesTo = (query, type, action) =>
  (!query.type || query.type === type) &&
  (!query.action || query.action.toLowerCase() === action.toLowerCase());

const userInclude = (alias, userUuid) => ({
  model: User,
  as: alias,
  attributes: userAttributes,
  paranoid: false,
  ...(userUuid ? { where: { uuid: userUuid }, required: true } : {}),
});

/** Fetches each immutable history source up to the requested global window. */
export default class HistoryRepository {
  async findAuditEvents(section, query, fetchLimit) {
    const entities = SECTION_ENTITIES[section].filter(
      (entity) => !query.type || AUDIT_TYPES[entity] === query.type,
    );
    if (!entities.length) return { count: 0, rows: [] };

    const where = { entity: { [Op.in]: entities } };
    if (query.action) where.action = query.action.toUpperCase();
    if (query.from || query.through) where.createdAt = createdAtWhere(query);
    if (section === HISTORY_SECTIONS.MAINTENANCE) {
      where.action = query.action ? where.action : { [Op.notIn]: auditExcludedActions };
      if (query.action && auditExcludedActions.includes(query.action.toUpperCase())) {
        return { count: 0, rows: [] };
      }
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      where[Op.or] = [
        { action: { [Op.like]: pattern } },
        { entity: { [Op.like]: pattern } },
        Sequelize.where(Sequelize.cast(Sequelize.col('old_values'), 'CHAR'), {
          [Op.like]: pattern,
        }),
        Sequelize.where(Sequelize.cast(Sequelize.col('new_values'), 'CHAR'), {
          [Op.like]: pattern,
        }),
        Sequelize.where(Sequelize.col('user.first_name'), { [Op.like]: pattern }),
        Sequelize.where(Sequelize.col('user.last_name'), { [Op.like]: pattern }),
      ];
    }

    const result = await AuditLog.findAndCountAll({
      where,
      include: [userInclude('user', query.userUuid)],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: fetchLimit,
      distinct: true,
      subQuery: false,
    });
    if (!result.rows.length) return result;

    const auditUuids = result.rows.map((item) => item.uuid);
    const [subjects] = await sequelize.query(auditSubjectJoinQuery, {
      replacements: { auditUuids },
    });
    const subjectByAuditUuid = new Map(
      subjects.map(({ auditUuid, subjectLabel }) => [auditUuid, subjectLabel]),
    );
    return {
      ...result,
      rows: result.rows.map((item) => {
        const value = typeof item.toJSON === 'function' ? item.toJSON() : item;
        return { ...value, subjectLabel: subjectByAuditUuid.get(value.uuid) ?? null };
      }),
    };
  }

  async findPlannedExecutions(query, fetchLimit) {
    if (query.type && query.type !== 'planned_execution') return { count: 0, rows: [] };
    if (
      query.action &&
      !['EXECUTE', 'EXECUTE_WITHOUT_PARTS'].includes(query.action.toUpperCase())
    ) {
      return { count: 0, rows: [] };
    }
    const where = {};
    if (query.action?.toUpperCase() === 'EXECUTE') {
      where.executionType = MAINTENANCE_EXECUTION_TYPES.STANDARD;
    } else if (query.action?.toUpperCase() === 'EXECUTE_WITHOUT_PARTS') {
      where.executionType = MAINTENANCE_EXECUTION_TYPES.WITHOUT_PART_REPLACEMENT;
    }
    if (query.from || query.through) where.performedAt = dateOnlyWhere(query);
    if (query.search) {
      const pattern = `%${query.search}%`;
      where[Op.or] = [
        { comment: { [Op.like]: pattern } },
        Sequelize.where(Sequelize.col('task.title'), { [Op.like]: pattern }),
        Sequelize.where(Sequelize.col('task.material.name'), { [Op.like]: pattern }),
        Sequelize.where(Sequelize.col('performedByUser.first_name'), { [Op.like]: pattern }),
        Sequelize.where(Sequelize.col('performedByUser.last_name'), { [Op.like]: pattern }),
      ];
    }
    return MaintenanceHistory.findAndCountAll({
      where,
      include: [
        {
          model: MaintenanceTask,
          as: 'task',
          attributes: ['uuid', 'title'],
          paranoid: false,
          include: [
            { model: Material, as: 'material', attributes: ['uuid', 'name'], paranoid: false },
          ],
        },
        userInclude('performedByUser', query.userUuid),
        { model: MaintenancePartUsage, as: 'partUsages' },
      ],
      order: [
        ['performedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: fetchLimit,
      distinct: true,
      subQuery: false,
    });
  }

  async findInterventions(query, fetchLimit) {
    if (!appliesTo(query, 'unplanned_intervention', 'INTERVENTION')) {
      return { count: 0, rows: [] };
    }
    const where = {};
    if (query.from || query.through) where.performedAt = dateOnlyWhere(query);
    if (query.search) {
      const pattern = `%${query.search}%`;
      where[Op.or] = [
        { description: { [Op.like]: pattern } },
        Sequelize.where(Sequelize.col('material.name'), { [Op.like]: pattern }),
        Sequelize.where(Sequelize.col('performedByUser.first_name'), { [Op.like]: pattern }),
        Sequelize.where(Sequelize.col('performedByUser.last_name'), { [Op.like]: pattern }),
      ];
    }
    return MaintenanceIntervention.findAndCountAll({
      where,
      include: [
        { model: Material, as: 'material', attributes: ['uuid', 'name'], paranoid: false },
        userInclude('performedByUser', query.userUuid),
        { model: MaintenancePartUsage, as: 'partUsages' },
      ],
      order: [
        ['performedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: fetchLimit,
      distinct: true,
      subQuery: false,
    });
  }

  async findStockMovements(query, fetchLimit) {
    if (query.type && query.type !== 'stock_movement') return { count: 0, rows: [], parts: [] };
    const where = { stockableType: STOCKABLE_TYPES.MAINTENANCE_PART };
    if (query.action) where.operation = query.action.toLowerCase();
    if (query.from || query.through) where.performedAt = dateOnlyWhere(query);
    let matchingPartIds = [];
    if (query.search) {
      const pattern = `%${query.search}%`;
      const parts = await MaintenancePart.findAll({
        attributes: ['id'],
        where: {
          [Op.or]: [
            { name: { [Op.like]: pattern } },
            { reference: { [Op.like]: pattern } },
            { supplierReference: { [Op.like]: pattern } },
          ],
        },
        paranoid: false,
      });
      matchingPartIds = parts.map(({ id }) => id);
      where[Op.or] = [
        { operation: { [Op.like]: pattern } },
        ...(matchingPartIds.length ? [{ stockableId: { [Op.in]: matchingPartIds } }] : []),
        Sequelize.where(Sequelize.col('performedByUser.first_name'), { [Op.like]: pattern }),
        Sequelize.where(Sequelize.col('performedByUser.last_name'), { [Op.like]: pattern }),
      ];
    }
    const result = await StockMovement.findAndCountAll({
      where,
      include: [userInclude('performedByUser', query.userUuid)],
      order: [
        ['performedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: fetchLimit,
      distinct: true,
      subQuery: false,
    });
    const partIds = [...new Set(result.rows.map(({ stockableId }) => stockableId))];
    const parts = partIds.length
      ? await MaintenancePart.findAll({
          attributes: ['id', 'uuid', 'name', 'reference'],
          where: { id: { [Op.in]: partIds } },
          paranoid: false,
        })
      : [];
    return { ...result, parts };
  }

  async findPriceChanges(query, fetchLimit) {
    if (!appliesTo(query, 'price_change', 'PRICE_UPDATE')) return { count: 0, rows: [] };
    const where = {};
    if (query.from || query.through) where.performedAt = dateOnlyWhere(query);
    if (query.search) {
      const pattern = `%${query.search}%`;
      where[Op.or] = [
        Sequelize.where(Sequelize.col('part.name'), { [Op.like]: pattern }),
        Sequelize.where(Sequelize.col('part.reference'), { [Op.like]: pattern }),
        Sequelize.where(Sequelize.col('changedByUser.first_name'), { [Op.like]: pattern }),
        Sequelize.where(Sequelize.col('changedByUser.last_name'), { [Op.like]: pattern }),
      ];
    }
    return MaintenancePartPriceHistory.findAndCountAll({
      where,
      include: [
        {
          model: MaintenancePart,
          as: 'part',
          attributes: ['uuid', 'name', 'reference'],
          paranoid: false,
        },
        userInclude('changedByUser', query.userUuid),
      ],
      order: [
        ['performedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: fetchLimit,
      distinct: true,
      subQuery: false,
    });
  }
}
