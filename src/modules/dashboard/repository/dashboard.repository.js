import Category from '../../categories/model/category.model.js';
import Material from '../../materials/model/material.model.js';
import PartManufacturer from '../../manufacturers/model/part-manufacturer.model.js';
import sequelize from '../../../config/database.js';
import MaintenanceRepository from '../../maintenance/repository/maintenance.repository.js';
import MaintenancePart from '../../maintenance/model/maintenance-part.model.js';
import MaintenancePartUsage from '../../maintenance/model/maintenance-part-usage.model.js';
import { Op } from 'sequelize';
import { LOW_STOCK_MAX_QUANTITY } from '../../maintenance/maintenance.constants.js';

/** Efficient aggregate queries used by the dashboard. */
export default class DashboardRepository {
  constructor(maintenanceRepository = new MaintenanceRepository()) {
    this.maintenanceRepository = maintenanceRepository;
  }
  async getCounts({
    includeMaintenance = true,
    includeLowStock = true,
    includeFinancial = true,
  } = {}) {
    const materialAttributes = [
      [
        sequelize.fn(
          'COALESCE',
          sequelize.fn('AVG', sequelize.literal('TIMESTAMPDIFF(YEAR, purchase_date, CURDATE())')),
          0,
        ),
        'averageAge',
      ],
    ];
    if (includeFinancial) {
      materialAttributes.unshift(
        [
          sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('purchase_price')), 0),
          'totalPurchaseValue',
        ],
        [
          sequelize.fn('COALESCE', sequelize.fn('AVG', sequelize.col('purchase_price')), 0),
          'averageCost',
        ],
      );
    }
    const [
      materialsTotal,
      materialsActive,
      materialsInactive,
      categoriesTotal,
      manufacturersTotal,
      materialMetrics,
      maintenanceTasks,
      maintenanceLowStock,
      maintenanceStockValues,
      maintenanceCosts,
    ] = await Promise.all([
      Material.count(),
      Material.count({ where: { active: true } }),
      Material.count({ where: { active: false } }),
      Category.count(),
      PartManufacturer.count(),
      Material.findOne({
        attributes: materialAttributes,
        raw: true,
      }),
      includeMaintenance ? this.maintenanceRepository.findDashboard() : undefined,
      includeLowStock
        ? MaintenancePart.count({
            where: {
              active: true,
              quantityOnHand: { [Op.lte]: LOW_STOCK_MAX_QUANTITY },
            },
          })
        : undefined,
      includeMaintenance && includeFinancial ? this.getMaintenanceStockValues() : undefined,
      includeMaintenance && includeFinancial ? this.getMaintenanceCosts() : undefined,
    ]);
    const counts = {
      materialsTotal,
      materialsActive,
      materialsInactive,
      categoriesTotal,
      manufacturersTotal,
      averageAge: Number(materialMetrics.averageAge),
    };
    if (includeFinancial) {
      counts.totalPurchaseValue = Number(materialMetrics.totalPurchaseValue);
      counts.averageCost = Number(materialMetrics.averageCost);
    }
    if (includeMaintenance) counts.maintenanceTasks = maintenanceTasks;
    if (includeLowStock) counts.maintenanceLowStock = maintenanceLowStock;
    if (includeMaintenance && includeFinancial) {
      counts.maintenanceStockValues = maintenanceStockValues;
      counts.maintenanceCosts = maintenanceCosts;
    }
    return counts;
  }

  getMaintenanceStockValues() {
    return MaintenancePart.findOne({
      attributes: [
        [sequelize.literal('COALESCE(SUM(quantity_on_hand * unit_price), 0)'), 'onHand'],
        [sequelize.literal('COALESCE(SUM(quantity_on_order * unit_price), 0)'), 'onOrder'],
      ],
      raw: true,
    });
  }

  getMaintenanceCosts(now = new Date()) {
    const currentYear = now.getUTCFullYear();
    return MaintenancePartUsage.findAll({
      attributes: [
        [sequelize.fn('YEAR', sequelize.col('performed_at')), 'year'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_cost')), 0), 'total'],
      ],
      where: {
        performedAt: {
          [Op.between]: [`${currentYear - 2}-01-01`, `${currentYear}-12-31`],
        },
      },
      group: [sequelize.fn('YEAR', sequelize.col('performed_at'))],
      raw: true,
    });
  }
}
