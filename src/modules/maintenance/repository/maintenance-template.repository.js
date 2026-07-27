import { Op } from 'sequelize';
import sequelize from '../../../config/database.js';
import Brand from '../../brands/model/brand.model.js';
import MaintenanceTask from '../model/maintenance-task.model.js';
import MaintenanceTemplate from '../model/maintenance-template.model.js';

const brandInclude = {
  model: Brand,
  as: 'brand',
  attributes: ['uuid', 'name'],
};

export default class MaintenanceTemplateRepository {
  async findAll({ search, active } = {}) {
    const where = {};
    if (search)
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { materialModel: { [Op.like]: `%${search}%` } },
        { partReference: { [Op.like]: `%${search}%` } },
      ];
    if (active !== undefined && active !== '') where.active = active;
    return MaintenanceTemplate.findAll({
      where,
      include: [brandInclude],
      order: [
        [{ model: Brand, as: 'brand' }, 'name', 'ASC'],
        ['material_model', 'ASC'],
        ['title', 'ASC'],
      ],
    });
  }

  async findByUuid(uuid) {
    return MaintenanceTemplate.findOne({ where: { uuid }, include: [brandInclude] });
  }

  async findDuplicate({ brandId, materialModel, title }, excludeUuid) {
    return MaintenanceTemplate.findOne({
      where: {
        brandId,
        materialModel,
        title,
        ...(excludeUuid ? { uuid: { [Op.ne]: excludeUuid } } : {}),
      },
      paranoid: false,
    });
  }

  async create(values) {
    return MaintenanceTemplate.create(values);
  }

  async update(template, values, options = {}) {
    return template.update(values, options);
  }

  async remove(template) {
    return template.destroy();
  }

  async restore(template) {
    return template.restore();
  }

  async countAssignments(templateId) {
    return MaintenanceTask.count({ where: { templateId }, paranoid: false });
  }

  async updateAssignmentDeadlines(templateId, calculateNextDate, options = {}) {
    const tasks = await MaintenanceTask.findAll({
      where: { templateId },
      transaction: options.transaction,
    });
    await Promise.all(
      tasks.map((task) =>
        task.update(
          {
            nextMaintenanceDate: calculateNextDate(task.lastMaintenanceDate),
          },
          options,
        ),
      ),
    );
  }

  async withTransaction(callback) {
    return sequelize.transaction(callback);
  }
}
