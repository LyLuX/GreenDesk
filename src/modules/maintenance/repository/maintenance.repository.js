import { Op, Sequelize } from 'sequelize';
import sequelize from '../../../config/database.js';
import normalizeBooleanFilter from '../../../core/utils/normalize-boolean-filter.js';
import Material from '../../materials/model/material.model.js';
import MaintenanceHistory from '../model/maintenance-history.model.js';
import MaintenanceOperation from '../model/maintenance-operation.model.js';
import MaintenancePart from '../model/maintenance-part.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import Supplier from '../../suppliers/model/supplier.model.js';
import MaintenanceTask from '../model/maintenance-task.model.js';
import MaintenanceTaskPart from '../model/maintenance-task-part.model.js';
import User from '../../users/model/user.model.js';

const materialInclude = {
  model: Material,
  as: 'material',
  attributes: ['uuid', 'name', 'active'],
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
    'uuid',
    'name',
    'manufacturer',
    'supplier',
    'reference',
    'supplierReference',
    'unit',
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
    `${taskAlias}.next_maintenance_date IS NOT NULL AND ` +
    `${taskAlias}.next_maintenance_date < '${today}'`;
  const dueToday =
    `${taskAlias}.next_maintenance_date IS NOT NULL AND ` +
    `${taskAlias}.next_maintenance_date = '${today}'`;
  const upcomingCondition =
    `${taskAlias}.next_maintenance_date IS NOT NULL AND ` +
    `${taskAlias}.next_maintenance_date > '${today}' AND ` +
    `${taskAlias}.next_maintenance_date <= '${upcoming}'`;
  return { overdue, dueToday, upcoming: upcomingCondition };
};

export default class MaintenanceRepository {
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
        where: {
          [Op.or]: [
            { title: { [Op.like]: pattern } },
            { description: { [Op.like]: pattern } },
            { notes: { [Op.like]: pattern } },
            { '$material.name$': { [Op.like]: pattern } },
            { '$operation.name$': { [Op.like]: pattern } },
          ],
        },
        subQuery: false,
      });
      where.id = { [Op.in]: matchingTasks.map((task) => task.id) };
    }
    if (priority) where.priority = priority;
    if (maintenanceType) where.maintenanceType = maintenanceType;
    const normalizedActive = normalizeBooleanFilter(active);
    if (normalizedActive !== undefined) where.active = normalizedActive;
    const today = new Date().toISOString().slice(0, 10);
    const next = new Date();
    next.setUTCDate(next.getUTCDate() + 30);
    const conditions = getStatusConditions({
      today,
      upcoming: next.toISOString().slice(0, 10),
    });
    if (status === 'overdue') where[Op.and] = [Sequelize.literal(`(${conditions.overdue})`)];
    if (status === 'dueToday') where[Op.and] = [Sequelize.literal(`(${conditions.dueToday})`)];
    if (status === 'upcoming') where[Op.and] = [Sequelize.literal(`(${conditions.upcoming})`)];
    if (status === 'upToDate')
      where[Op.and] = [
        Sequelize.literal(
          `NOT (${conditions.overdue}) AND NOT (${conditions.dueToday}) AND ` +
            `NOT (${conditions.upcoming})`,
        ),
      ];
    const include = [
      {
        ...materialInclude,
        ...(materialUuid ? { where: { uuid: materialUuid }, required: true } : {}),
      },
      operationInclude,
      partsInclude,
    ];
    const normalizedLimit = limit === 'all' ? null : Math.min(Number(limit) || 5, 100);
    return MaintenanceTask.findAndCountAll({
      where,
      include,
      order: [['next_maintenance_date', 'ASC']],
      ...(normalizedLimit
        ? {
            limit: normalizedLimit,
            offset: (Math.max(Number(page), 1) - 1) * normalizedLimit,
          }
        : {}),
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
      where: {
        active: true,
        [Op.and]: [
          Sequelize.literal(
            `(${conditions.overdue}) OR (${conditions.dueToday}) OR (${conditions.upcoming})`,
          ),
        ],
      },
      include: [materialInclude, operationInclude, partsInclude],
      order: [['next_maintenance_date', 'ASC']],
    });
  }
  async findByUuid(uuid, options = {}) {
    return MaintenanceTask.findOne({
      where: { uuid },
      include: [materialInclude, operationInclude, partsInclude],
      transaction: options.transaction,
      lock: options.lock ? options.transaction?.LOCK.UPDATE : undefined,
    });
  }
  async create(values, options = {}) {
    return MaintenanceTask.create(values, options);
  }
  async update(task, values, options = {}) {
    return task.update(values, options);
  }
  async createHistory(values, options = {}) {
    return MaintenanceHistory.create(values, options);
  }
  async replaceParts(taskId, parts, options = {}) {
    await MaintenanceTaskPart.destroy({
      where: { maintenanceTaskId: taskId },
      transaction: options.transaction,
    });
    if (!parts.length) return [];
    return MaintenanceTaskPart.bulkCreate(
      parts.map(({ partId, quantity }) => ({
        maintenanceTaskId: taskId,
        maintenancePartId: partId,
        quantity,
      })),
      { transaction: options.transaction },
    );
  }
  async findForOrderList({ from, through }) {
    return MaintenanceTask.findAll({
      where: {
        active: true,
        nextMaintenanceDate: {
          ...(from ? { [Op.gte]: from } : {}),
          [Op.lte]: through,
        },
      },
      include: [materialInclude, operationInclude, partsInclude],
      order: [['next_maintenance_date', 'ASC']],
    });
  }
  async findHistory(taskId) {
    return MaintenanceHistory.findAll({
      where: { maintenanceTaskId: taskId },
      include: [
        { model: User, as: 'performedByUser', attributes: ['uuid', 'firstName', 'lastName'] },
      ],
      order: [['performed_at', 'DESC']],
    });
  }
  async remove(task) {
    return task.destroy();
  }
  async withTransaction(callback) {
    return sequelize.transaction(callback);
  }
}
