import { Op } from 'sequelize';
import Brand from '../model/brand.model.js';
export default class BrandRepository {
  async findAll(search) {
    return Brand.findAll({
      where: search ? { name: { [Op.like]: `%${search}%` } } : {},
      order: [['name', 'ASC']],
    });
  }
  async findByUuid(uuid) {
    return Brand.findOne({ where: { uuid } });
  }
  async findByName(name) {
    return Brand.findOne({ where: { name } });
  }
  async create(values) {
    return Brand.create(values);
  }
  async update(item, values) {
    return item.update(values);
  }
}
