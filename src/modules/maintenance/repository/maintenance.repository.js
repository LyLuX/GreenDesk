import { Op, Sequelize } from 'sequelize';
import sequelize from '../../../config/database.js';
import Material from '../../materials/model/material.model.js';
import MaintenanceHistory from '../model/maintenance-history.model.js';
import MaintenanceTask from '../model/maintenance-task.model.js';
import User from '../../users/model/user.model.js';

const materialInclude = {
  model: Material,
  as: 'material',
  attributes: ['uuid', 'name'],
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
    materialUuid,
    priority,
    maintenanceType,
    active,
    status,
    page = 1,
    limit = 5,
  } = {}) {
    const where = {};
    if (priority) where.priority = priority;
    if (maintenanceType) where.maintenanceType = maintenanceType;
    if (active !== undefined && active !== '') where.active = active;
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
      include: [materialInclude],
      order: [['next_maintenance_date', 'ASC']],
    });
  }
  async findByUuid(uuid, options = {}) {
    return MaintenanceTask.findOne({
      where: { uuid },
      include: [materialInclude],
      transaction: options.transaction,
      lock: options.lock ? options.transaction?.LOCK.UPDATE : undefined,
    });
  }
  async create(values) {
    return MaintenanceTask.create(values);
  }
  async update(task, values, options = {}) {
    return task.update(values, options);
  }
  async createHistory(values, options = {}) {
    return MaintenanceHistory.create(values, options);
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
