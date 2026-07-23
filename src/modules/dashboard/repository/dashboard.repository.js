import Category from '../../categories/model/category.model.js';
import Material from '../../materials/model/material.model.js';
import Property from '../../properties/model/property.model.js';

/** Efficient aggregate queries used by the dashboard. */
export default class DashboardRepository {
  async getCounts() {
    const [materialsTotal, materialsActive, materialsInactive, categoriesTotal, propertiesTotal] =
      await Promise.all([
        Material.count(),
        Material.count({ where: { active: true } }),
        Material.count({ where: { active: false } }),
        Category.count(),
        Property.count(),
      ]);
    return { materialsTotal, materialsActive, materialsInactive, categoriesTotal, propertiesTotal };
  }
}
