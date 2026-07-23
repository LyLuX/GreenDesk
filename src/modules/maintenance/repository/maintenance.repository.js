import { Op, QueryTypes, Sequelize } from 'sequelize';
import sequelize from '../../../config/database.js';
import Material from '../../materials/model/material.model.js';
import MaintenanceHistory from '../model/maintenance-history.model.js';
import MaintenanceTask from '../model/maintenance-task.model.js';
import User from '../../users/model/user.model.js';

const materialInclude = {
  model: Material,
  as: 'material',
  attributes: ['uuid', 'name', 'engineHours'],
};

export default class MaintenanceRepository {
  async findAll({
    materialUuid,
    priority,
    maintenanceType,
    active,
    status,
    page = 1,
    limit = 25,
  } = {}) {
    const where = {};
    if (priority) where.priority = priority;
    if (maintenanceType) where.maintenanceType = maintenanceType;
    if (active !== undefined) where.active = active;
    const today = new Date().toISOString().slice(0, 10);
    const next = new Date();
    next.setUTCDate(next.getUTCDate() + 30);
    const overdueCondition =
      "(MaintenanceTask.next_maintenance_date IS NOT NULL AND MaintenanceTask.next_maintenance_date <= '" +
      today +
      "') OR (MaintenanceTask.next_engine_hours IS NOT NULL AND material.engine_hours >= MaintenanceTask.next_engine_hours)";
    const upcomingCondition =
      'NOT (' +
      overdueCondition +
      ") AND ((MaintenanceTask.next_maintenance_date IS NOT NULL AND MaintenanceTask.next_maintenance_date <= '" +
      next.toISOString().slice(0, 10) +
      "') OR (MaintenanceTask.next_engine_hours IS NOT NULL AND material.engine_hours >= MaintenanceTask.next_engine_hours - GREATEST(10, MaintenanceTask.interval_hours * 0.2)))";
    if (status === 'overdue') where[Op.and] = [Sequelize.literal(`(${overdueCondition})`)];
    if (status === 'upcoming') where[Op.and] = [Sequelize.literal(`(${upcomingCondition})`)];
    if (status === 'upToDate')
      where[Op.and] = [
        Sequelize.literal(`NOT (${overdueCondition}) AND NOT (${upcomingCondition})`),
      ];
    const include = [
      {
        ...materialInclude,
        ...(materialUuid ? { where: { uuid: materialUuid }, required: true } : {}),
      },
    ];
    const normalizedLimit = Math.min(Number(limit) || 25, 100);
    return MaintenanceTask.findAndCountAll({
      where,
      include,
      order: [['next_maintenance_date', 'ASC']],
      limit: normalizedLimit,
      offset: (Math.max(Number(page), 1) - 1) * normalizedLimit,
      distinct: true,
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
  async countDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const withinThirtyDays = new Date();
    withinThirtyDays.setUTCDate(withinThirtyDays.getUTCDate() + 30);
    const monthStart = `${today.slice(0, 7)}-01`;
    const [metrics, completed] = await Promise.all([
      sequelize.query(
        `SELECT
          SUM(next_maintenance_date = :today) AS todayCount,
          SUM((next_maintenance_date IS NOT NULL AND next_maintenance_date <= :today) OR (next_engine_hours IS NOT NULL AND m.engine_hours >= next_engine_hours)) AS overdueCount,
          SUM(NOT ((next_maintenance_date IS NOT NULL AND next_maintenance_date <= :today) OR (next_engine_hours IS NOT NULL AND m.engine_hours >= next_engine_hours)) AND ((next_maintenance_date IS NOT NULL AND next_maintenance_date <= :upcoming) OR (next_engine_hours IS NOT NULL AND m.engine_hours >= next_engine_hours - GREATEST(10, interval_hours * 0.2)))) AS upcomingCount
         FROM maintenance_tasks mt JOIN materials m ON m.id = mt.material_id
         WHERE mt.active = 1 AND mt.deleted_at IS NULL`,
        {
          replacements: { today, upcoming: withinThirtyDays.toISOString().slice(0, 10) },
          type: QueryTypes.SELECT,
        },
      ),
      MaintenanceHistory.count({ where: { performedAt: { [Op.gte]: monthStart } } }),
    ]);
    const row = metrics[0] ?? {};
    return [
      Number(row.todayCount ?? 0),
      Number(row.overdueCount ?? 0),
      completed,
      Number(row.upcomingCount ?? 0),
    ];
  }
}
