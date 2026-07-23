import { Op } from 'sequelize';
import Material from '../../materials/model/material.model.js';
import MaintenanceHistory from '../model/maintenance-history.model.js';
import MaintenanceTask from '../model/maintenance-task.model.js';

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
    overdue,
    upcoming,
    page = 1,
    limit = 25,
  } = {}) {
    const where = {};
    if (priority) where.priority = priority;
    if (maintenanceType) where.maintenanceType = maintenanceType;
    if (active !== undefined) where.active = active;
    const today = new Date().toISOString().slice(0, 10);
    if (overdue === true) where.nextMaintenanceDate = { [Op.lt]: today };
    if (upcoming === true) {
      const next = new Date();
      next.setUTCDate(next.getUTCDate() + 30);
      where.nextMaintenanceDate = { [Op.between]: [today, next.toISOString().slice(0, 10)] };
    }
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
  async findByUuid(uuid) {
    return MaintenanceTask.findOne({ where: { uuid }, include: [materialInclude] });
  }
  async create(values) {
    return MaintenanceTask.create(values);
  }
  async update(task, values) {
    return task.update(values);
  }
  async createHistory(values) {
    return MaintenanceHistory.create(values);
  }
  async findHistory(taskId) {
    return MaintenanceHistory.findAll({
      where: { maintenanceTaskId: taskId },
      order: [['performed_at', 'DESC']],
    });
  }
  async countDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const withinThirtyDays = new Date();
    withinThirtyDays.setUTCDate(withinThirtyDays.getUTCDate() + 30);
    const monthStart = `${today.slice(0, 7)}-01`;
    return Promise.all([
      MaintenanceTask.count({ where: { active: true, nextMaintenanceDate: today } }),
      MaintenanceTask.count({ where: { active: true, nextMaintenanceDate: { [Op.lt]: today } } }),
      MaintenanceHistory.count({ where: { performedAt: { [Op.gte]: monthStart } } }),
      MaintenanceTask.count({
        where: {
          active: true,
          nextMaintenanceDate: {
            [Op.between]: [today, withinThirtyDays.toISOString().slice(0, 10)],
          },
        },
      }),
    ]);
  }
}
