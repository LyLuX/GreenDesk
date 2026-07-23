import { Op } from 'sequelize';

import Material from '../model/material.model.js';

/** Sequelize persistence operations for material catalogue records. */
export default class MaterialRepository {
  async findAll(search) {
    return Material.findAll({
      where: search ? { name: { [Op.like]: `%${search}%` } } : {},
      order: [['name', 'ASC']],
    });
  }

  async findByUuid(uuid) {
    return Material.findOne({ where: { uuid } });
  }

  async findByName(name) {
    return Material.findOne({ where: { name } });
  }

  async findByReference(reference) {
    return reference ? Material.findOne({ where: { reference } }) : null;
  }

  async create(values) {
    return Material.create(values);
  }

  async update(material, values) {
    return material.update(values);
  }
}
