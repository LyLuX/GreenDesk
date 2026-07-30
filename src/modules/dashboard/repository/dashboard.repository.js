import Category from '../../categories/model/category.model.js';
import Material from '../../materials/model/material.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import sequelize from '../../../config/database.js';
import MaintenanceRepository from '../../maintenance/repository/maintenance.repository.js';

/** Efficient aggregate queries used by the dashboard. */
export default class DashboardRepository {
  constructor(maintenanceRepository = new MaintenanceRepository()) {
    this.maintenanceRepository = maintenanceRepository;
  }
  async getCounts({ includeMaintenance = true } = {}) {
    const [
      materialsTotal,
      materialsActive,
      materialsInactive,
      categoriesTotal,
      manufacturersTotal,
      materialMetrics,
      maintenanceTasks,
    ] = await Promise.all([
      Material.count(),
      Material.count({ where: { active: true } }),
      Material.count({ where: { active: false } }),
      Category.count(),
      PartManufacturer.count(),
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
      includeMaintenance ? this.maintenanceRepository.findDashboard() : undefined,
    ]);
    return {
      materialsTotal,
      materialsActive,
      materialsInactive,
      categoriesTotal,
      manufacturersTotal,
      totalPurchaseValue: Number(materialMetrics.totalPurchaseValue),
      averageCost: Number(materialMetrics.averageCost),
      averageAge: Number(materialMetrics.averageAge),
      maintenanceTasks,
    };
  }
}
