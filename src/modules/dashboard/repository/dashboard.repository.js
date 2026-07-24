import Category from '../../categories/model/category.model.js';
import Material from '../../materials/model/material.model.js';
import Brand from '../../brands/model/brand.model.js';
import sequelize from '../../../config/database.js';
import MaintenanceRepository from '../../maintenance/repository/maintenance.repository.js';

/** Efficient aggregate queries used by the dashboard. */
export default class DashboardRepository {
  constructor(maintenanceRepository = new MaintenanceRepository()) {
    this.maintenanceRepository = maintenanceRepository;
  }
  async getCounts() {
    const [
      materialsTotal,
      materialsActive,
      materialsInactive,
      categoriesTotal,
      brandsTotal,
      materialMetrics,
      maintenance,
    ] = await Promise.all([
      Material.count(),
      Material.count({ where: { active: true } }),
      Material.count({ where: { active: false } }),
      Category.count(),
      Brand.count(),
      Material.findOne({
        attributes: [
          [
            sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('purchase_price')), 0),
            'totalPurchaseValue',
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
      this.maintenanceRepository.countDashboard(),
    ]);
    return {
      materialsTotal,
      materialsActive,
      materialsInactive,
      categoriesTotal,
      brandsTotal,
      totalPurchaseValue: Number(materialMetrics.totalPurchaseValue),
      averageCost: Number(materialMetrics.averageCost),
      averageAge: Number(materialMetrics.averageAge),
      maintenanceToday: maintenance.today,
      maintenanceOverdue: maintenance.overdue,
      maintenanceUpcoming: maintenance.upcoming,
    };
  }
}
