import Category from '../../categories/model/category.model.js';
import Material from '../../materials/model/material.model.js';
import Property from '../../properties/model/property.model.js';
import Brand from '../../brands/model/brand.model.js';
import sequelize from '../../../config/database.js';

/** Efficient aggregate queries used by the dashboard. */
export default class DashboardRepository {
  async getCounts() {
    const [
      materialsTotal,
      materialsActive,
      materialsInactive,
      categoriesTotal,
      propertiesTotal,
      brandsTotal,
      materialMetrics,
    ] = await Promise.all([
      Material.count(),
      Material.count({ where: { active: true } }),
      Material.count({ where: { active: false } }),
      Category.count(),
      Property.count(),
      Brand.count(),
      Material.findOne({
        attributes: [
          [
            sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('current_value')), 0),
            'value',
          ],
          [
            sequelize.fn('COALESCE', sequelize.fn('AVG', sequelize.col('purchase_price')), 0),
            'averageCost',
          ],
          [
            sequelize.fn(
              'COALESCE',
              sequelize.fn(
                'AVG',
                sequelize.literal('TIMESTAMPDIFF(YEAR, purchase_date, CURDATE())'),
              ),
              0,
            ),
            'averageAge',
          ],
        ],
        raw: true,
      }),
    ]);
    return {
      materialsTotal,
      materialsActive,
      materialsInactive,
      categoriesTotal,
      propertiesTotal,
      brandsTotal,
      totalValue: Number(materialMetrics.value),
      averageCost: Number(materialMetrics.averageCost),
      averageAge: Number(materialMetrics.averageAge),
    };
  }
}
