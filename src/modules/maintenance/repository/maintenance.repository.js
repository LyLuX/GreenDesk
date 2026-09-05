import { Op, Sequelize } from 'sequelize';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import { normalizePagination } from '../../../core/utils/pagination.js';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
import Material from '../../materials/model/material.model.js';
import MaintenanceHistory from '../model/maintenance-history.model.js';
import MaintenanceIntervention from '../model/maintenance-intervention.model.js';
import MaintenanceOperation from '../model/maintenance-operation.model.js';
import MaintenancePart from '../model/maintenance-part.model.js';
import MaintenancePartUsage from '../model/maintenance-part-usage.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import Supplier from '../../suppliers/model/supplier.model.js';
import MaintenanceTask from '../model/maintenance-task.model.js';
import MaintenanceTaskPart from '../model/maintenance-task-part.model.js';
import User from '../../users/model/user.model.js';
import { companyValues, companyWhere } from '../../../core/company/company-context.js';

const materialInclude = {
  model: Material,
  as: 'material',
  attributes: ['uuid', 'name', 'model', 'serialNumber', 'active'],
};
const operationInclude = {
  model: MaintenanceOperation,
  as: 'operation',
  attributes: ['uuid', 'name', 'description', 'maintenanceType'],
};
const partsInclude = {
  model: MaintenancePart,
  as: 'parts',
  attributes: [
    'id',
    'uuid',
    'name',
    'manufacturer',
    'supplier',
    'reference',
    'supplierReference',
    'unit',
    'unitPrice',
    'quantityOnHand',
    'quantityOnOrder',
    'active',
  ],
  through: { attributes: ['quantity'] },
  include: [
    {
      model: PartManufacturer,
      as: 'manufacturerDirectory',
      attributes: ['uuid'],
    },
    {
      model: Supplier,
      as: 'supplierDirectory',
      attributes: ['uuid'],
    },
  ],
};

const getStatusConditions = ({ taskAlias = 'MaintenanceTask', today, upcoming }) => {
  const overdue =
    `${taskAlias}.interval_days > 0 AND ${taskAlias}.next_maintenance_date IS NOT NULL AND ` +
    `${taskAlias}.next_maintenance_date < '${today}'`;
  const dueToday =
    `${taskAlias}.interval_days > 0 AND ${taskAlias}.next_maintenance_date IS NOT NULL AND ` +
    `${taskAlias}.next_maintenance_date = '${today}'`;
  const upcomingCondition =
    `${taskAlias}.interval_days > 0 AND ${taskAlias}.next_maintenance_date IS NOT NULL AND ` +
    `${taskAlias}.next_maintenance_date > '${today}' AND ` +
    `${taskAlias}.next_maintenance_date <= '${upcoming}'`;
  return { overdue, dueToday, upcoming: upcomingCondition };
};

const getStatusFilter = (status) => {
  if (!status) return null;
  const today = new Date().toISOString().slice(0, 10);
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + 30);
  const conditions = getStatusConditions({
    today,
    upcoming: next.toISOString().slice(0, 10),
  });
  if (status === 'overdue') return Sequelize.literal(`(${conditions.overdue})`);
  if (status === 'dueToday') return Sequelize.literal(`(${conditions.dueToday})`);
  if (status === 'upcoming') return Sequelize.literal(`(${conditions.upcoming})`);
  if (status === 'wearBased') return Sequelize.literal('MaintenanceTask.interval_days = 0');
  if (status === 'upToDate')
    return Sequelize.literal(
      `MaintenanceTask.interval_days > 0 AND NOT (${conditions.overdue}) AND ` +
        `NOT (${conditions.dueToday}) AND ` +
        `NOT (${conditions.upcoming})`,
    );
  return null;
};

export default class MaintenanceRepository extends TransactionalRepository {
  async findAll({
    search,
    materialUuid,
    priority,
    maintenanceType,
    active,
    status,
    page = 1,
    limit = 5,
  } = {}) {
    const where = {};
    if (search) {
      const pattern = `%${search}%`;
      const matchingTasks = await MaintenanceTask.findAll({
        attributes: ['id'],
        include: [materialInclude, operationInclude],
        where: companyWhere({
          [Op.or]: [
            { title: { [Op.like]: pattern } },
            { description: { [Op.like]: pattern } },
            { notes: { [Op.like]: pattern } },
            { '$material.name$': { [Op.like]: pattern } },
            { '$operation.name$': { [Op.like]: pattern } },
          ],
        }),
        subQuery: false,
      });
      where.id = { [Op.in]: matchingTasks.map((task) => task.id) };
    }
    if (priority) where.priority = priority;
    if (maintenanceType) where.maintenanceType = maintenanceType;
    const normalizedActive = normalizeBooleanFilter(active, true);
    if (normalizedActive !== undefined) where.active = normalizedActive;
    const statusFilter = getStatusFilter(status);
    if (statusFilter) where[Op.and] = [statusFilter];
    const include = [
      {
        ...materialInclude,
        ...(materialUuid ? { where: { uuid: materialUuid }, required: true } : {}),
      },
      operationInclude,
      partsInclude,
    ];
    const pagination = normalizePagination({ page, limit });
    return MaintenanceTask.findAndCountAll({
      where: companyWhere(where),
      include,
      order: [
        [Sequelize.literal('nextMaintenanceDate IS NULL'), 'ASC'],
        ['next_maintenance_date', 'ASC'],
        ['priority', 'DESC'],
        ['title', 'ASC'],
        ['id', 'ASC'],
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
    });
  }
  async findDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const next = new Date();
    next.setUTCDate(next.getUTCDate() + 30);
    const conditions = getStatusConditions({
      today,
      upcoming: next.toISOString().slice(0, 10),
    });
    return MaintenanceTask.findAll({
      where: companyWhere({
        active: true,
        [Op.and]: [
          Sequelize.literal(
            `(${conditions.overdue}) OR (${conditions.dueToday}) OR ` +
              `(${conditions.upcoming}) OR MaintenanceTask.interval_days = 0`,
          ),
        ],
      }),
      include: [materialInclude, operationInclude, partsInclude],
      order: [['next_maintenance_date', 'ASC']],
    });
  }
  async findByUuid(uuid, options = {}) {
    return MaintenanceTask.findOne({
      where: companyWhere({ uuid }),
      include: [materialInclude, operationInclude, partsInclude],
      transaction: options.transaction,
      lock: options.lock ? options.transaction?.LOCK.UPDATE : undefined,
    });
  }
  async create(values, options = {}) {
    return MaintenanceTask.create(companyValues(values), options);
  }
  async update(task, values, options = {}) {
    return task.update(values, options);
  }
  async createHistory(values, options = {}) {
    return MaintenanceHistory.create(companyValues(values), options);
  }
  async createIntervention(values, options = {}) {
    return MaintenanceIntervention.create(companyValues(values), options);
  }
  async findInterventions({ materialUuid, page, limit } = {}) {
    const pagination = normalizePagination({ page, limit });
    return MaintenanceIntervention.findAndCountAll({
      where: companyWhere(),
      include: [
        {
          ...materialInclude,
          ...(materialUuid ? { where: { uuid: materialUuid }, required: true } : {}),
        },
        { model: User, as: 'performedByUser', attributes: ['uuid', 'firstName', 'lastName'] },
        { model: MaintenancePartUsage, as: 'partUsages' },
      ],
      order: [
        ['performedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
    });
  }
  async findInterventionByUuid(uuid) {
    return MaintenanceIntervention.findOne({
      where: companyWhere({ uuid }),
      include: [
        materialInclude,
        { model: User, as: 'performedByUser', attributes: ['uuid', 'firstName', 'lastName'] },
        { model: MaintenancePartUsage, as: 'partUsages' },
      ],
    });
  }
  async createPartUsages(values, options = {}) {
    if (!values.length) return [];
    return MaintenancePartUsage.bulkCreate(values.map(companyValues), {
      ...options,
      validate: true,
    });
  }
  async replaceParts(taskId, parts, options = {}) {
    await MaintenanceTaskPart.destroy({
      where: companyWhere({ maintenanceTaskId: taskId }),
      transaction: options.transaction,
    });
    if (!parts.length) return [];
    return MaintenanceTaskPart.bulkCreate(
      parts.map(({ partId, quantity }) =>
        companyValues({
          maintenanceTaskId: taskId,
          maintenancePartId: partId,
          quantity,
        }),
      ),
      { transaction: options.transaction },
    );
  }
  async findForOrderList({ from, through, status }) {
    const statusFilter = getStatusFilter(status);
    const deadlineFilter = statusFilter
      ? { [Op.and]: [statusFilter] }
      : {
          intervalDays: { [Op.gt]: 0 },
          nextMaintenanceDate: {
            ...(from ? { [Op.gte]: from } : {}),
            [Op.lte]: through,
          },
        };
    return MaintenanceTask.findAll({
      where: companyWhere({
        active: true,
        ...deadlineFilter,
      }),
      include: [materialInclude, operationInclude, partsInclude],
      order: [['next_maintenance_date', 'ASC']],
    });
  }
  async findForMaintenanceSheets({ statuses = [] } = {}) {
    const statusFilters = statuses.map((status) => getStatusFilter(status)).filter(Boolean);
    return MaintenanceTask.findAll({
      where: companyWhere({
        active: true,
        ...(statusFilters.length ? { [Op.and]: [{ [Op.or]: statusFilters }] } : {}),
      }),
      include: [materialInclude, operationInclude, partsInclude],
      order: [
        ['priority', 'DESC'],
        ['next_maintenance_date', 'ASC'],
        ['title', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  }
  async findHistory(taskId, query = {}) {
    const pagination = normalizePagination(query);
    return MaintenanceHistory.findAndCountAll({
      where: companyWhere({ maintenanceTaskId: taskId }),
      include: [
        { model: User, as: 'performedByUser', attributes: ['uuid', 'firstName', 'lastName'] },
      ],
      order: [['performed_at', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
    });
  }
  async remove(task, options = {}) {
    return task.destroy(options);
  }
}
