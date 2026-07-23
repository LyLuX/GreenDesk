import Property from '../../../modules/properties/model/property.model.js';
import { Op } from 'sequelize';

/** Sequelize persistence operations for configurable property definitions. */
export default class PropertyRepository {
  async findAll(search) {
    return Property.findAll({
      where: search ? { name: { [Op.like]: `%${search}%` } } : {},
      order: [['name', 'ASC']],
    });
  }
  async findByUuid(uuid) {
    return Property.findOne({ where: { uuid } });
  }
  async findByName(name) {
    return Property.findOne({ where: { name } });
  }
  async create(values) {
    return Property.create(values);
  }
  async update(property, values) {
    return property.update(values);
  }
}
