import DashboardRepository from '../repository/dashboard.repository.js';
import MaintenanceService from '../../maintenance/service/maintenance.service.js';

/** Aggregates dashboard statistics without HTTP concerns. */
export default class DashboardService {
  constructor(
    repository = new DashboardRepository(),
    maintenanceService = new MaintenanceService(),
  ) {
    this.repository = repository;
    this.maintenanceService = maintenanceService;
  }
  async getSummary({ includeMaintenance = true, includeFinancial = true } = {}) {
    const counts = await this.repository.getCounts({ includeMaintenance, includeFinancial });
    const currentYear = new Date().getUTCFullYear();
    const maintenanceCostByYear = new Map(
      (counts.maintenanceCosts ?? []).map(({ year, total }) => [Number(year), Number(total)]),
    );
    const maintenanceStockValues = counts.maintenanceStockValues ?? {};
    const maintenanceItems = (counts.maintenanceTasks ?? []).map((task) =>
      this.maintenanceService.toPublic(task),
    );
    const maintenance = {
      today: maintenanceItems.filter(({ status }) => status === 'dueToday'),
      overdue: maintenanceItems.filter(({ status }) => status === 'overdue'),
      upcoming: maintenanceItems.filter(({ status }) => status === 'upcoming'),
      wearBased: maintenanceItems.filter(({ status }) => status === 'wearBased'),
    };
    const summary = {
      materials: {
        total: counts.materialsTotal,
        active: counts.materialsActive,
        inactive: counts.materialsInactive,
      },
      categories: { total: counts.categoriesTotal },
      fleet: { averageAge: counts.averageAge },
    };
    if (counts.manufacturersTotal !== undefined) {
      summary.manufacturers = { total: counts.manufacturersTotal };
    }
    if (includeFinancial) {
      summary.fleet.totalPurchaseValue = counts.totalPurchaseValue;
      summary.fleet.averageCost = counts.averageCost;
    }
    if (counts.maintenanceTasks !== undefined) {
      const maintenanceSummary = {
        today: maintenance.today.length,
        overdue: maintenance.overdue.length,
        upcoming: maintenance.upcoming.length,
        wearBased: maintenance.wearBased.length,
        items: maintenance,
      };
      if (includeFinancial) {
        maintenanceSummary.stockValues = {
          onHand: Number(maintenanceStockValues.onHand ?? 0),
          onOrder: Number(maintenanceStockValues.onOrder ?? 0),
        };
        maintenanceSummary.costs = Array.from({ length: 3 }, (_value, index) => ({
          year: currentYear - index,
          total: maintenanceCostByYear.get(currentYear - index) ?? 0,
        }));
      }
      summary.maintenance = maintenanceSummary;
    }
    return summary;
  }
}
