import Category from '../../../modules/categories/model/category.model.js';
import { Op } from 'sequelize';
import TransactionalRepository from './transactional.repository.js';

/** Sequelize persistence operations for category records. */
export default class CategoryRepository extends TransactionalRepository {
  async findAll(search) {
    return Category.findAll({
      where: search ? { name: { [Op.like]: `%${search}%` } } : {},
      order: [['name', 'ASC']],
    });
  }
  async findByUuid(uuid, { transaction } = {}) {
    return Category.findOne({ where: { uuid }, transaction });
  }
  async findByIds(ids) {
    if (!ids.length) return [];
    return Category.findAll({
      attributes: ['id', 'name'],
      where: { id: { [Op.in]: ids } },
      paranoid: false,
    });
  }
  async findByName(name, { withDeleted = false, transaction } = {}) {
    return Category.findOne({ where: { name }, paranoid: !withDeleted, transaction });
  }
  async create(values, { transaction } = {}) {
    return Category.create(values, { transaction });
  }
  async update(category, values, { transaction } = {}) {
    return category.update(values, { transaction });
  }
  async delete(category, { transaction } = {}) {
    return category.destroy({ transaction });
  }
  async restore(category, { transaction } = {}) {
    return category.restore({ transaction });
  }
}
