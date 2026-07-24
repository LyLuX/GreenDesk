import Category from '../../../modules/categories/model/category.model.js';
import { Op } from 'sequelize';

/** Sequelize persistence operations for category records. */
export default class CategoryRepository {
  async findAll(search) {
    return Category.findAll({
      where: search ? { name: { [Op.like]: `%${search}%` } } : {},
      order: [['name', 'ASC']],
    });
  }
  async findByUuid(uuid) {
    return Category.findOne({ where: { uuid } });
  }
  async findByName(name, { withDeleted = false } = {}) {
    return Category.findOne({ where: { name }, paranoid: !withDeleted });
  }
  async create(values) {
    return Category.create(values);
  }
  async update(category, values) {
    return category.update(values);
  }
  async delete(category) {
    return category.destroy();
  }
  async restore(category) {
    return category.restore();
  }
}
